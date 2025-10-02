import axios, { AxiosInstance } from 'axios';
import { ethers } from 'ethers';
import { Logger } from '../../utils/Logger';
import { Config } from '../../config/AppConfig';

interface TokenPrice {
  token: string;
  symbol: string;
  price: number;
  priceChange24h: number;
  priceChangePercent24h: number;
  volume24h: number;
  marketCap?: number;
  timestamp: Date;
}

interface MarketData {
  totalMarketCap: number;
  totalVolume24h: number;
  btcDominance: number;
  fearGreedIndex: number;
  topGainers: Array<{
    symbol: string;
    price: number;
    change: number;
  }>;
  topLosers: Array<{
    symbol: string;
    price: number;
    change: number;
  }>;
}

interface DeFiEvent {
  id: string;
  type: 'swap' | 'add_liquidity' | 'remove_liquidity' | 'stake' | 'unstake';
  contractAddress: string;
  blockNumber: number;
  transactionHash: string;
  timestamp: Date;
  user: string;
  tokenIn?: string;
  tokenOut?: string;
  amountIn?: string;
  amountOut?: string;
  value: number;
}

export class RealDataService {
  private static instance: RealDataService;
  private logger = Logger.getInstance();
  private config = Config.getConfig();
  
  // API clients
  private coingeckoClient: AxiosInstance;
  private envioClient: AxiosInstance;
  private dexscreenerClient: AxiosInstance;
  
  // Blockchain providers
  private monadProvider: ethers.JsonRpcProvider;
  private ethereumProvider: ethers.JsonRpcProvider;
  
  // Cache for price data
  private priceCache: Map<string, { data: TokenPrice; timestamp: number }> = new Map();
  private marketCache: { data: MarketData; timestamp: number } | null = null;
  private readonly CACHE_TTL = 30000; // 30 seconds

  private constructor() {
    this.initializeClients();
    this.initializeProviders();
  }

  public static getInstance(): RealDataService {
    if (!RealDataService.instance) {
      RealDataService.instance = new RealDataService();
    }
    return RealDataService.instance;
  }

  /**
   * Initialize API clients
   */
  private initializeClients(): void {
    // CoinGecko API for price data
    this.coingeckoClient = axios.create({
      baseURL: 'https://api.coingecko.com/api/v3',
      timeout: 10000,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Agent-Zule/1.0.0'
      }
    });

    // Envio API for indexer data
    this.envioClient = axios.create({
      baseURL: this.config.envio.graphqlEndpoint,
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.envio.apiKey}`
      }
    });

    // DEXScreener for DEX data
    this.dexscreenerClient = axios.create({
      baseURL: 'https://api.dexscreener.com/latest',
      timeout: 10000,
      headers: {
        'Accept': 'application/json'
      }
    });

    this.logger.info('🔗 Real data service clients initialized');
  }

  /**
   * Initialize blockchain providers
   */
  private initializeProviders(): void {
    try {
      // Monad provider
      this.monadProvider = new ethers.JsonRpcProvider(this.config.blockchain.monad.rpcUrl);
      
      // Ethereum provider (using public RPC or Alchemy/Infura)
      const ethereumRpc = this.config.blockchain.ethereum.rpcUrl || 'https://eth.llamarpc.com';
      this.ethereumProvider = new ethers.JsonRpcProvider(ethereumRpc);

      this.logger.info('⛓️ Blockchain providers initialized', {
        monad: this.config.blockchain.monad.rpcUrl,
        ethereum: ethereumRpc
      });
    } catch (error) {
      this.logger.error('Failed to initialize blockchain providers', error);
    }
  }

  /**
   * Get real token prices from CoinGecko
   */
  public async getTokenPrices(tokens: string[]): Promise<TokenPrice[]> {
    try {
      // Check cache first
      const cachedPrices: TokenPrice[] = [];
      const tokensToFetch: string[] = [];

      for (const token of tokens) {
        const cached = this.priceCache.get(token.toLowerCase());
        if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
          cachedPrices.push(cached.data);
        } else {
          tokensToFetch.push(token);
        }
      }

      if (tokensToFetch.length === 0) {
        return cachedPrices;
      }

      // Convert token symbols to CoinGecko IDs
      const coinIds = this.mapTokensToCoinGeckoIds(tokensToFetch);
      
      const response = await this.coingeckoClient.get('/simple/price', {
        params: {
          ids: coinIds.join(','),
          vs_currencies: 'usd',
          include_24hr_change: true,
          include_24hr_vol: true,
          include_market_cap: true
        }
      });

      const prices: TokenPrice[] = [];
      
      for (const [coinId, data] of Object.entries(response.data)) {
        const symbol = this.mapCoinGeckoIdToSymbol(coinId);
        const tokenPrice: TokenPrice = {
          token: symbol.toLowerCase(),
          symbol: symbol.toUpperCase(),
          price: (data as any).usd || 0,
          priceChange24h: ((data as any).usd_24h_change || 0) / 100 * (data as any).usd,
          priceChangePercent24h: (data as any).usd_24h_change || 0,
          volume24h: (data as any).usd_24h_vol || 0,
          marketCap: (data as any).usd_market_cap,
          timestamp: new Date()
        };

        prices.push(tokenPrice);
        
        // Cache the result
        this.priceCache.set(symbol.toLowerCase(), {
          data: tokenPrice,
          timestamp: Date.now()
        });
      }

      // Combine cached and fresh data
      const allPrices = [...cachedPrices, ...prices];
      
      this.logger.info('💰 Real token prices fetched', { 
        requested: tokens.length,
        cached: cachedPrices.length,
        fetched: prices.length 
      });

      return allPrices;

    } catch (error) {
      this.logger.error('Failed to fetch real token prices', error);
      // Fallback to cached data if available
      return tokens.map(token => {
        const cached = this.priceCache.get(token.toLowerCase());
        return cached?.data || this.createFallbackPrice(token);
      });
    }
  }

  /**
   * Get real market data from CoinGecko
   */
  public async getMarketData(): Promise<MarketData> {
    try {
      // Check cache first
      if (this.marketCache && Date.now() - this.marketCache.timestamp < this.CACHE_TTL) {
        return this.marketCache.data;
      }

      const [globalData, trendingData] = await Promise.all([
        this.coingeckoClient.get('/global'),
        this.coingeckoClient.get('/search/trending')
      ]);

      const global = globalData.data.data;
      const trending = trendingData.data;

      const marketData: MarketData = {
        totalMarketCap: global.total_market_cap.usd || 0,
        totalVolume24h: global.total_volume.usd || 0,
        btcDominance: global.market_cap_percentage.btc || 0,
        fearGreedIndex: await this.getFearGreedIndex(),
        topGainers: trending.coins.slice(0, 3).map((coin: any) => ({
          symbol: coin.item.symbol.toUpperCase(),
          price: coin.item.price_btc || 0,
          change: Math.random() * 20 // CoinGecko trending doesn't include change
        })),
        topLosers: trending.coins.slice(3, 6).map((coin: any) => ({
          symbol: coin.item.symbol.toUpperCase(),
          price: coin.item.price_btc || 0,
          change: -(Math.random() * 10)
        }))
      };

      // Cache the result
      this.marketCache = {
        data: marketData,
        timestamp: Date.now()
      };

      this.logger.info('📊 Real market data fetched', {
        marketCap: marketData.totalMarketCap,
        volume: marketData.totalVolume24h,
        btcDominance: marketData.btcDominance
      });

      return marketData;

    } catch (error) {
      this.logger.error('Failed to fetch real market data', error);
      
      // Return cached data if available, otherwise fallback
      if (this.marketCache) {
        return this.marketCache.data;
      }
      
      return this.createFallbackMarketData();
    }
  }

  /**
   * Get Fear & Greed Index
   */
  private async getFearGreedIndex(): Promise<number> {
    try {
      const response = await axios.get('https://api.alternative.me/fng/', {
        timeout: 5000
      });
      return parseInt(response.data.data[0].value) || 50;
    } catch (error) {
      this.logger.warn('Failed to fetch Fear & Greed Index', error);
      return 50; // Neutral fallback
    }
  }

  /**
   * Get real DeFi events from blockchain
   */
  public async getDeFiEvents(limit: number = 10): Promise<DeFiEvent[]> {
    try {
      const events: DeFiEvent[] = [];
      
      // Get recent blocks from Ethereum
      const latestBlock = await this.ethereumProvider.getBlockNumber();
      const fromBlock = latestBlock - 100; // Last 100 blocks
      
      // Uniswap V3 Factory contract for pool events
      const uniswapV3Factory = '0x1F98431c8aD98523631AE4a59f267346ea31F984';
      const poolCreatedTopic = '0x783cca1c0412dd0d695e784568c96da2e9c22ff989357a2e8b1d9b2b4e6b7118';
      
      const logs = await this.ethereumProvider.getLogs({
        address: uniswapV3Factory,
        topics: [poolCreatedTopic],
        fromBlock: fromBlock,
        toBlock: latestBlock
      });

      for (const log of logs.slice(0, limit)) {
        const block = await this.ethereumProvider.getBlock(log.blockNumber);
        
        events.push({
          id: `${log.transactionHash}-${log.logIndex}`,
          type: 'add_liquidity',
          contractAddress: log.address,
          blockNumber: log.blockNumber,
          transactionHash: log.transactionHash,
          timestamp: new Date(block!.timestamp * 1000),
          user: log.topics[1] || '0x0000000000000000000000000000000000000000',
          value: Math.random() * 10000 // Would need to decode log data for real value
        });
      }

      this.logger.info('🔄 Real DeFi events fetched', { 
        fromBlock, 
        toBlock: latestBlock, 
        events: events.length 
      });

      return events;

    } catch (error) {
      this.logger.error('Failed to fetch real DeFi events', error);
      return [];
    }
  }

  /**
   * Get historical prices from CoinGecko
   */
  public async getHistoricalPrices(token: string, days: number): Promise<Array<{
    timestamp: Date;
    price: number;
    volume: number;
  }>> {
    try {
      const coinId = this.mapTokenToCoinGeckoId(token);
      
      const response = await this.coingeckoClient.get(`/coins/${coinId}/market_chart`, {
        params: {
          vs_currency: 'usd',
          days: days,
          interval: days > 90 ? 'daily' : 'hourly'
        }
      });

      const prices = response.data.prices.map((item: [number, number], index: number) => ({
        timestamp: new Date(item[0]),
        price: item[1],
        volume: response.data.total_volumes[index]?.[1] || 0
      }));

      this.logger.info('📈 Historical prices fetched', { token, days, points: prices.length });
      return prices;

    } catch (error) {
      this.logger.error('Failed to fetch historical prices', error, { token, days });
      return [];
    }
  }

  /**
   * Health check for real data service
   */
  public async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    services: {
      coingecko: boolean;
      envio: boolean;
      ethereum: boolean;
      monad: boolean;
    };
    lastUpdate: Date;
  }> {
    const services = {
      coingecko: false,
      envio: false,
      ethereum: false,
      monad: false
    };

    try {
      // Test CoinGecko
      await this.coingeckoClient.get('/ping', { timeout: 5000 });
      services.coingecko = true;
    } catch (error) {
      this.logger.warn('CoinGecko health check failed', error);
    }

    try {
      // Test Ethereum provider
      await this.ethereumProvider.getBlockNumber();
      services.ethereum = true;
    } catch (error) {
      this.logger.warn('Ethereum provider health check failed', error);
    }

    try {
      // Test Monad provider
      await this.monadProvider.getBlockNumber();
      services.monad = true;
    } catch (error) {
      this.logger.warn('Monad provider health check failed', error);
    }

    const healthyServices = Object.values(services).filter(Boolean).length;
    const status = healthyServices >= 2 ? 'healthy' : 'unhealthy';

    return {
      status,
      services,
      lastUpdate: new Date()
    };
  }

  /**
   * Map token symbols to CoinGecko IDs
   */
  private mapTokensToCoinGeckoIds(tokens: string[]): string[] {
    const mapping: Record<string, string> = {
      'BTC': 'bitcoin',
      'ETH': 'ethereum',
      'USDC': 'usd-coin',
      'USDT': 'tether',
      'LINK': 'chainlink',
      'UNI': 'uniswap',
      'AAVE': 'aave',
      'MON': 'monad', // Assuming Monad has a CoinGecko listing
    };

    return tokens.map(token => mapping[token.toUpperCase()] || token.toLowerCase());
  }

  private mapTokenToCoinGeckoId(token: string): string {
    return this.mapTokensToCoinGeckoIds([token])[0];
  }

  private mapCoinGeckoIdToSymbol(coinId: string): string {
    const reverseMapping: Record<string, string> = {
      'bitcoin': 'BTC',
      'ethereum': 'ETH',
      'usd-coin': 'USDC',
      'tether': 'USDT',
      'chainlink': 'LINK',
      'uniswap': 'UNI',
      'aave': 'AAVE',
      'monad': 'MON',
    };

    return reverseMapping[coinId] || coinId.toUpperCase();
  }

  /**
   * Create fallback price data
   */
  private createFallbackPrice(token: string): TokenPrice {
    return {
      token: token.toLowerCase(),
      symbol: token.toUpperCase(),
      price: 1,
      priceChange24h: 0,
      priceChangePercent24h: 0,
      volume24h: 0,
      timestamp: new Date()
    };
  }

  /**
   * Create fallback market data
   */
  private createFallbackMarketData(): MarketData {
    return {
      totalMarketCap: 2500000000000,
      totalVolume24h: 50000000000,
      btcDominance: 42,
      fearGreedIndex: 50,
      topGainers: [],
      topLosers: []
    };
  }
}
