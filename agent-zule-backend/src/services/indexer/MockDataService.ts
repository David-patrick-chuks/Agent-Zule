import { Logger } from '../../utils/Logger';

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

export class MockDataService {
  private static instance: MockDataService;
  private logger = Logger.getInstance();
  
  // Mock token prices
  private tokenPrices: Map<string, TokenPrice> = new Map();
  
  // Mock market data
  private marketData: MarketData;

  private constructor() {
    this.initializeMockData();
  }

  public static getInstance(): MockDataService {
    if (!MockDataService.instance) {
      MockDataService.instance = new MockDataService();
    }
    return MockDataService.instance;
  }

  /**
   * Initialize mock data
   */
  private initializeMockData(): void {
    // Initialize token prices
    const tokens = [
      { symbol: 'MON', price: 0.15, change: 15.5 },
      { symbol: 'ETH', price: 3200, change: 8.2 },
      { symbol: 'BTC', price: 65000, change: 3.1 },
      { symbol: 'USDC', price: 1.0, change: 0.1 },
      { symbol: 'USDT', price: 1.0, change: -0.05 },
      { symbol: 'LINK', price: 18.5, change: 12.3 },
      { symbol: 'UNI', price: 8.2, change: -2.1 },
      { symbol: 'AAVE', price: 95.0, change: 6.8 }
    ];

    tokens.forEach(token => {
      this.tokenPrices.set(token.symbol, {
        token: token.symbol.toLowerCase(),
        symbol: token.symbol,
        price: token.price,
        priceChange24h: token.price * (token.change / 100),
        priceChangePercent24h: token.change,
        volume24h: Math.random() * 10000000,
        marketCap: token.price * (Math.random() * 1000000000),
        timestamp: new Date()
      });
    });

    // Initialize market data
    this.marketData = {
      totalMarketCap: 2500000000000,
      totalVolume24h: 50000000000,
      btcDominance: 42.5,
      fearGreedIndex: 65,
      topGainers: [
        { symbol: 'MON', price: 0.15, change: 15.5 },
        { symbol: 'LINK', price: 18.5, change: 12.3 },
        { symbol: 'ETH', price: 3200, change: 8.2 }
      ],
      topLosers: [
        { symbol: 'UNI', price: 8.2, change: -2.1 },
        { symbol: 'USDT', price: 1.0, change: -0.05 }
      ]
    };

    this.logger.info('🎭 Mock data service initialized with sample DeFi data');
  }

  /**
   * Get token prices (replaces external Envio API)
   */
  public async getTokenPrices(tokens: string[]): Promise<TokenPrice[]> {
    const prices: TokenPrice[] = [];
    
    for (const token of tokens) {
      const symbol = token.toUpperCase();
      let price = this.tokenPrices.get(symbol);
      
      if (!price) {
        // Generate random price for unknown tokens
        price = {
          token: token.toLowerCase(),
          symbol: symbol,
          price: Math.random() * 100,
          priceChange24h: (Math.random() - 0.5) * 10,
          priceChangePercent24h: (Math.random() - 0.5) * 20,
          volume24h: Math.random() * 1000000,
          marketCap: Math.random() * 100000000,
          timestamp: new Date()
        };
        this.tokenPrices.set(symbol, price);
      }
      
      // Add some random fluctuation
      price.price += (Math.random() - 0.5) * price.price * 0.01;
      price.timestamp = new Date();
      
      prices.push(price);
    }

    this.logger.debug('Token prices fetched', { tokens, count: prices.length });
    return prices;
  }

  /**
   * Get market data (replaces external Envio API)
   */
  public async getMarketData(): Promise<MarketData> {
    // Add some random fluctuation to market data
    this.marketData.totalMarketCap += (Math.random() - 0.5) * 100000000000;
    this.marketData.totalVolume24h += (Math.random() - 0.5) * 5000000000;
    this.marketData.fearGreedIndex += (Math.random() - 0.5) * 5;
    
    // Keep fear & greed index in bounds
    this.marketData.fearGreedIndex = Math.max(0, Math.min(100, this.marketData.fearGreedIndex));

    this.logger.debug('Market data fetched', { 
      marketCap: this.marketData.totalMarketCap,
      volume: this.marketData.totalVolume24h 
    });

    return { ...this.marketData };
  }

  /**
   * Get historical prices (replaces external Envio API)
   */
  public async getHistoricalPrices(token: string, days: number): Promise<Array<{
    timestamp: Date;
    price: number;
    volume: number;
  }>> {
    const prices = [];
    const basePrice = this.tokenPrices.get(token.toUpperCase())?.price || Math.random() * 100;
    
    for (let i = days; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      // Generate realistic price movement
      const volatility = 0.05; // 5% daily volatility
      const randomChange = (Math.random() - 0.5) * 2 * volatility;
      const price = basePrice * (1 + randomChange * i * 0.1);
      
      prices.push({
        timestamp: date,
        price: Math.max(0.01, price), // Ensure positive price
        volume: Math.random() * 1000000
      });
    }

    this.logger.debug('Historical prices generated', { token, days, count: prices.length });
    return prices;
  }

  /**
   * Get DeFi events (replaces external Envio API)
   */
  public async getDeFiEvents(limit: number = 10): Promise<DeFiEvent[]> {
    const events: DeFiEvent[] = [];
    const eventTypes = ['swap', 'add_liquidity', 'remove_liquidity', 'stake', 'unstake'] as const;
    const tokens = Array.from(this.tokenPrices.keys());

    for (let i = 0; i < limit; i++) {
      const type = eventTypes[Math.floor(Math.random() * eventTypes.length)];
      const tokenIn = tokens[Math.floor(Math.random() * tokens.length)];
      const tokenOut = tokens[Math.floor(Math.random() * tokens.length)];
      
      events.push({
        id: `event_${Date.now()}_${i}`,
        type,
        contractAddress: '0x' + Math.random().toString(16).substr(2, 40),
        blockNumber: Math.floor(Math.random() * 100000) + 19000000,
        transactionHash: '0x' + Math.random().toString(16).substr(2, 64),
        timestamp: new Date(Date.now() - Math.random() * 86400000), // Last 24 hours
        user: '0x' + Math.random().toString(16).substr(2, 40),
        tokenIn: type === 'swap' ? tokenIn : undefined,
        tokenOut: type === 'swap' ? tokenOut : undefined,
        amountIn: type === 'swap' ? (Math.random() * 1000).toFixed(6) : undefined,
        amountOut: type === 'swap' ? (Math.random() * 1000).toFixed(6) : undefined,
        value: Math.random() * 10000
      });
    }

    this.logger.debug('DeFi events generated', { limit, count: events.length });
    return events;
  }

  /**
   * Health check for mock service
   */
  public async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    tokenCount: number;
    lastUpdate: Date;
  }> {
    return {
      status: 'healthy',
      tokenCount: this.tokenPrices.size,
      lastUpdate: new Date()
    };
  }

  /**
   * Update token price (for real-time simulation)
   */
  public updateTokenPrice(symbol: string, newPrice: number): void {
    const token = this.tokenPrices.get(symbol.toUpperCase());
    if (token) {
      const oldPrice = token.price;
      token.price = newPrice;
      token.priceChange24h = newPrice - oldPrice;
      token.priceChangePercent24h = ((newPrice - oldPrice) / oldPrice) * 100;
      token.timestamp = new Date();
      
      this.logger.debug('Token price updated', { symbol, oldPrice, newPrice });
    }
  }

  /**
   * Simulate real-time price updates
   */
  public startPriceSimulation(): void {
    setInterval(() => {
      // Update a few random token prices
      const tokens = Array.from(this.tokenPrices.keys());
      const tokensToUpdate = tokens.slice(0, 3); // Update first 3 tokens
      
      tokensToUpdate.forEach(symbol => {
        const token = this.tokenPrices.get(symbol);
        if (token) {
          // Small random price movement (±1%)
          const change = (Math.random() - 0.5) * 0.02;
          const newPrice = token.price * (1 + change);
          this.updateTokenPrice(symbol, newPrice);
        }
      });
    }, 5000); // Update every 5 seconds
  }
}
