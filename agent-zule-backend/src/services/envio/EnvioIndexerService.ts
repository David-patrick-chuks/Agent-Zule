import axios, { AxiosInstance } from 'axios';
import { Config } from '../../config/AppConfig';
import { Logger } from '../../utils/Logger';
import { RealDataService } from '../indexer/RealDataService';

export interface IndexerQuery {
  query: string;
  variables?: Record<string, any>;
}

export interface IndexerResponse<T = any> {
  data: T;
  errors?: Array<{
    message: string;
    locations?: Array<{ line: number; column: number }>;
    path?: string[];
  }>;
}

export interface DeFiEvent {
  id: string;
  type: 'swap' | 'add_liquidity' | 'remove_liquidity' | 'stake' | 'unstake' | 'claim' | 'transfer';
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
  gasUsed: number;
  gasPrice: string;
}

export interface TokenPrice {
  token: string;
  symbol: string;
  price: number;
  priceChange24h: number;
  priceChangePercent24h: number;
  volume24h: number;
  marketCap?: number;
  timestamp: Date;
}

export interface LiquidityPool {
  id: string;
  token0: string;
  token1: string;
  symbol0: string;
  symbol1: string;
  reserve0: string;
  reserve1: string;
  totalSupply: string;
  apy: number;
  volume24h: number;
  fees24h: number;
  timestamp: Date;
}

export interface YieldFarm {
  id: string;
  protocol: string;
  token: string;
  symbol: string;
  apy: number;
  tvl: number;
  staked: string;
  rewards: string;
  risk: 'low' | 'medium' | 'high';
  timestamp: Date;
}

export interface MarketData {
  totalVolume24h: number;
  totalFees24h: number;
  activeUsers: number;
  transactionsCount: number;
  averageGasPrice: string;
  timestamp: Date;
}

export class EnvioIndexerService {
  private static instance: EnvioIndexerService;
  private httpClient: AxiosInstance;
  private logger = Logger.getInstance();
  private config = Config.getConfig();
  private realDataService: RealDataService;

  private constructor() {
    this.httpClient = axios.create({
      baseURL: this.config.envio.indexerUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.envio.apiKey}`
      }
    });

    this.realDataService = RealDataService.getInstance();
    this.setupInterceptors();
  }

  public static getInstance(): EnvioIndexerService {
    if (!EnvioIndexerService.instance) {
      EnvioIndexerService.instance = new EnvioIndexerService();
    }
    return EnvioIndexerService.instance;
  }

  /**
   * Execute GraphQL query against Envio indexer
   */
  public async query<T = any>(query: IndexerQuery): Promise<IndexerResponse<T>> {
    try {
      this.logger.logEnvio('graphql_query', 'query_execution', {
        query: query.query.substring(0, 100) + '...',
        variables: query.variables
      });

      const response = await this.httpClient.post('', {
        query: query.query,
        variables: query.variables || {}
      });

      if (response.data.errors) {
        this.logger.error('GraphQL query errors', response.data.errors);
        throw new Error(`GraphQL errors: ${response.data.errors.map((e: any) => e.message).join(', ')}`);
      }

      return response.data;

    } catch (error) {
      this.logger.error('Failed to execute GraphQL query', error);
      throw error;
    }
  }

  /**
   * Get DeFi events for a specific user
   */
  public async getUserDeFiEvents(
    userAddress: string,
    limit: number = 100,
    offset: number = 0
  ): Promise<DeFiEvent[]> {
    try {
      const query = `
        query GetUserDeFiEvents($userAddress: String!, $limit: Int!, $offset: Int!) {
          defiEvents(
            where: { user: $userAddress }
            orderBy: timestamp
            orderDirection: desc
            first: $limit
            skip: $offset
          ) {
            id
            type
            contractAddress
            blockNumber
            transactionHash
            timestamp
            user
            tokenIn
            tokenOut
            amountIn
            amountOut
            value
            gasUsed
            gasPrice
          }
        }
      `;

      const response = await this.query<{ defiEvents: DeFiEvent[] }>({
        query,
        variables: {
          userAddress: userAddress.toLowerCase(),
          limit,
          offset
        }
      });

      return response.data.defiEvents.map(this.mapDeFiEvent);

    } catch (error) {
      this.logger.error('Failed to get user DeFi events', error, { userAddress });
      return [];
    }
  }

  /**
   * Get token prices for multiple tokens
   */
  public async getTokenPrices(tokenAddresses: string[]): Promise<TokenPrice[]> {
    try {
      const query = `
        query GetTokenPrices($tokenAddresses: [String!]!) {
          tokenPrices(
            where: { token_in: $tokenAddresses }
            orderBy: timestamp
            orderDirection: desc
            first: ${tokenAddresses.length}
          ) {
            id
            token
            symbol
            price
            priceChange24h
            priceChangePercent24h
            volume24h
            marketCap
            timestamp
          }
        }
      `;

      // Use real data service instead of external GraphQL
      const prices = await this.realDataService.getTokenPrices(tokenAddresses);
      
      this.logger.info('🚀 Real token prices fetched', { 
        tokenAddresses, 
        count: prices.length 
      });
      
      return prices;

    } catch (error) {
      this.logger.error('Failed to get token prices', error, { tokenAddresses });
      return [];
    }
  }

  /**
   * Get liquidity pools with highest APY
   */
  public async getTopLiquidityPools(limit: number = 20): Promise<LiquidityPool[]> {
    try {
      const query = `
        query GetTopLiquidityPools($limit: Int!) {
          liquidityPools(
            orderBy: apy
            orderDirection: desc
            first: $limit
          ) {
            id
            token0
            token1
            symbol0
            symbol1
            reserve0
            reserve1
            totalSupply
            apy
            volume24h
            fees24h
            timestamp
          }
        }
      `;

      const response = await this.query<{ liquidityPools: LiquidityPool[] }>({
        query,
        variables: { limit }
      });

      return response.data.liquidityPools.map(this.mapLiquidityPool);

    } catch (error) {
      this.logger.error('Failed to get top liquidity pools', error);
      return [];
    }
  }

  /**
   * Get yield farming opportunities
   */
  public async getYieldFarms(
    minApy: number = 0.05,
    maxRisk: 'low' | 'medium' | 'high' = 'high',
    limit: number = 50
  ): Promise<YieldFarm[]> {
    try {
      const riskLevels = {
        low: 0,
        medium: 1,
        high: 2
      };

      const query = `
        query GetYieldFarms($minApy: BigDecimal!, $maxRiskLevel: Int!, $limit: Int!) {
          yieldFarms(
            where: { 
              apy_gte: $minApy,
              riskLevel_lte: $maxRiskLevel
            }
            orderBy: apy
            orderDirection: desc
            first: $limit
          ) {
            id
            protocol
            token
            symbol
            apy
            tvl
            staked
            rewards
            riskLevel
            timestamp
          }
        }
      `;

      const response = await this.query<{ yieldFarms: YieldFarm[] }>({
        query,
        variables: {
          minApy,
          maxRiskLevel: riskLevels[maxRisk],
          limit
        }
      });

      return response.data.yieldFarms.map(this.mapYieldFarm);

    } catch (error) {
      this.logger.error('Failed to get yield farms', error);
      return [];
    }
  }

  /**
   * Get market data and statistics
   */
  public async getMarketData(): Promise<MarketData> {
    try {
      const query = `
        query GetMarketData {
          marketData(
            orderBy: timestamp
            orderDirection: desc
            first: 1
          ) {
            id
            totalVolume24h
            totalFees24h
            activeUsers
            transactionsCount
            averageGasPrice
            timestamp
          }
        }
      `;

      // Use real data service instead of external GraphQL
      const marketData = await this.realDataService.getMarketData();
      
      this.logger.info('🚀 Real market data fetched', { 
        marketCap: marketData.totalMarketCap,
        volume: marketData.totalVolume24h 
      });
      
      return marketData;

    } catch (error) {
      this.logger.error('Failed to get market data', error);
      return this.getDefaultMarketData();
    }
  }

  /**
   * Get portfolio events for analysis
   */
  public async getPortfolioEvents(
    portfolioId: string,
    fromDate?: Date,
    toDate?: Date,
    limit: number = 100
  ): Promise<DeFiEvent[]> {
    try {
      let whereClause = `portfolioId: "${portfolioId}"`;
      
      if (fromDate || toDate) {
        const conditions: string[] = [];
        if (fromDate) conditions.push(`timestamp_gte: ${Math.floor(fromDate.getTime() / 1000)}`);
        if (toDate) conditions.push(`timestamp_lte: ${Math.floor(toDate.getTime() / 1000)}`);
        whereClause += `, ${conditions.join(', ')}`;
      }

      const query = `
        query GetPortfolioEvents($limit: Int!) {
          portfolioEvents(
            where: { ${whereClause} }
            orderBy: timestamp
            orderDirection: desc
            first: $limit
          ) {
            id
            type
            contractAddress
            blockNumber
            transactionHash
            timestamp
            user
            portfolioId
            tokenIn
            tokenOut
            amountIn
            amountOut
            value
            gasUsed
            gasPrice
          }
        }
      `;

      const response = await this.query<{ portfolioEvents: DeFiEvent[] }>({
        query,
        variables: { limit }
      });

      return response.data.portfolioEvents.map(this.mapDeFiEvent);

    } catch (error) {
      this.logger.error('Failed to get portfolio events', error, { portfolioId });
      return [];
    }
  }

  /**
   * Get cross-chain opportunities
   */
  public async getCrossChainOpportunities(
    sourceChain: string = 'ethereum',
    targetChain: string = 'monad'
  ): Promise<{
    bridgeOpportunities: Array<{
      from: string;
      to: string;
      bridge: string;
      apy: number;
      risk: 'low' | 'medium' | 'high';
    }>;
    arbitrageOpportunities: Array<{
      token: string;
      sourcePrice: number;
      targetPrice: number;
      priceDifference: number;
      arbitrageProfit: number;
    }>;
  }> {
    try {
      const query = `
        query GetCrossChainOpportunities($sourceChain: String!, $targetChain: String!) {
          crossChainOpportunities(
            where: { 
              sourceChain: $sourceChain,
              targetChain: $targetChain
            }
          ) {
            id
            bridgeOpportunities {
              from
              to
              bridge
              apy
              riskLevel
            }
            arbitrageOpportunities {
              token
              sourcePrice
              targetPrice
              priceDifference
              arbitrageProfit
            }
          }
        }
      `;

      const response = await this.query({
        query,
        variables: { sourceChain, targetChain }
      });

      // Process and return opportunities
      return {
        bridgeOpportunities: [],
        arbitrageOpportunities: []
      };

    } catch (error) {
      this.logger.error('Failed to get cross-chain opportunities', error);
      return {
        bridgeOpportunities: [],
        arbitrageOpportunities: []
      };
    }
  }

  // Private helper methods
  private setupInterceptors(): void {
    // Request interceptor
    this.httpClient.interceptors.request.use(
      (config) => {
        this.logger.debug('Envio indexer request', {
          url: config.url,
          method: config.method,
          data: config.data
        });
        return config;
      },
      (error) => {
        this.logger.error('Envio indexer request error', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.httpClient.interceptors.response.use(
      (response) => {
        this.logger.debug('Envio indexer response', {
          status: response.status,
          dataSize: JSON.stringify(response.data).length
        });
        return response;
      },
      (error) => {
        this.logger.error('Envio indexer response error', error);
        return Promise.reject(error);
      }
    );
  }

  private mapDeFiEvent(rawEvent: any): DeFiEvent {
    return {
      id: rawEvent.id,
      type: rawEvent.type,
      contractAddress: rawEvent.contractAddress,
      blockNumber: parseInt(rawEvent.blockNumber),
      transactionHash: rawEvent.transactionHash,
      timestamp: new Date(parseInt(rawEvent.timestamp) * 1000),
      user: rawEvent.user,
      tokenIn: rawEvent.tokenIn,
      tokenOut: rawEvent.tokenOut,
      amountIn: rawEvent.amountIn,
      amountOut: rawEvent.amountOut,
      value: parseFloat(rawEvent.value),
      gasUsed: parseInt(rawEvent.gasUsed),
      gasPrice: rawEvent.gasPrice
    };
  }

  private mapTokenPrice(rawPrice: any): TokenPrice {
    return {
      token: rawPrice.token,
      symbol: rawPrice.symbol,
      price: parseFloat(rawPrice.price),
      priceChange24h: parseFloat(rawPrice.priceChange24h),
      priceChangePercent24h: parseFloat(rawPrice.priceChangePercent24h),
      volume24h: parseFloat(rawPrice.volume24h),
      marketCap: rawPrice.marketCap ? parseFloat(rawPrice.marketCap) : undefined,
      timestamp: new Date(parseInt(rawPrice.timestamp) * 1000)
    };
  }

  private mapLiquidityPool(rawPool: any): LiquidityPool {
    return {
      id: rawPool.id,
      token0: rawPool.token0,
      token1: rawPool.token1,
      symbol0: rawPool.symbol0,
      symbol1: rawPool.symbol1,
      reserve0: rawPool.reserve0,
      reserve1: rawPool.reserve1,
      totalSupply: rawPool.totalSupply,
      apy: parseFloat(rawPool.apy),
      volume24h: parseFloat(rawPool.volume24h),
      fees24h: parseFloat(rawPool.fees24h),
      timestamp: new Date(parseInt(rawPool.timestamp) * 1000)
    };
  }

  private mapYieldFarm(rawFarm: any): YieldFarm {
    const riskLevels = ['low', 'medium', 'high'];
    
    return {
      id: rawFarm.id,
      protocol: rawFarm.protocol,
      token: rawFarm.token,
      symbol: rawFarm.symbol,
      apy: parseFloat(rawFarm.apy),
      tvl: parseFloat(rawFarm.tvl),
      staked: rawFarm.staked,
      rewards: rawFarm.rewards,
      risk: riskLevels[rawFarm.riskLevel] as 'low' | 'medium' | 'high',
      timestamp: new Date(parseInt(rawFarm.timestamp) * 1000)
    };
  }

  private mapMarketData(rawData: any): MarketData {
    return {
      totalVolume24h: parseFloat(rawData.totalVolume24h),
      totalFees24h: parseFloat(rawData.totalFees24h),
      activeUsers: parseInt(rawData.activeUsers),
      transactionsCount: parseInt(rawData.transactionsCount),
      averageGasPrice: rawData.averageGasPrice,
      timestamp: new Date(parseInt(rawData.timestamp) * 1000)
    };
  }

  private getDefaultMarketData(): MarketData {
    return {
      totalVolume24h: 0,
      totalFees24h: 0,
      activeUsers: 0,
      transactionsCount: 0,
      averageGasPrice: '0',
      timestamp: new Date()
    };
  }

  /**
   * Get historical price data for a token
   */
  public async getHistoricalPrices(tokenAddress: string, days: number): Promise<TokenPrice[]> {
    try {
      const query = `
        query GetHistoricalPrices($tokenAddress: String!, $days: Int!) {
          tokenPrices(
            where: { token: $tokenAddress }
            orderBy: timestamp
            orderDirection: desc
            first: $days
          ) {
            token
            symbol
            price
            priceChange24h
            priceChangePercent24h
            volume24h
            marketCap
            timestamp
          }
        }
      `;

      // Use real data service instead of external GraphQL
      const historicalData = await this.realDataService.getHistoricalPrices(tokenAddress, days);
      
      // Convert to TokenPrice format
      const tokenPrices = historicalData.map(item => ({
        token: tokenAddress.toLowerCase(),
        symbol: tokenAddress.toUpperCase(),
        price: item.price,
        priceChange24h: 0, // Would need previous day's price to calculate
        priceChangePercent24h: 0,
        volume24h: item.volume,
        timestamp: item.timestamp
      }));
      
      this.logger.info('🚀 Real historical prices fetched', { 
        tokenAddress, 
        days, 
        count: tokenPrices.length 
      });
      
      return tokenPrices;

    } catch (error) {
      this.logger.error('Failed to get historical prices', error, { tokenAddress, days });
      return [];
    }
  }

  /**
   * Health check for Envio indexer
   */
  public async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    responseTime: number;
    lastBlock: number;
    errors: string[];
  }> {
    const startTime = Date.now();
    
    try {
      const query = `
        query HealthCheck {
          _meta {
            hasIndexingErrors
            block {
              number
            }
          }
        }
      `;

      const response = await this.query<{ _meta: any }>({ query });
      const responseTime = Date.now() - startTime;

      return {
        status: response.data._meta.hasIndexingErrors ? 'unhealthy' : 'healthy',
        responseTime,
        lastBlock: response.data._meta.block.number,
        errors: []
      };

    } catch (error) {
      const responseTime = Date.now() - startTime;
      return {
        status: 'unhealthy',
        responseTime,
        lastBlock: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }
}
