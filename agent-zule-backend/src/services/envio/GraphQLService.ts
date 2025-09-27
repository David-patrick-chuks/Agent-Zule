import { GraphQLClient, gql } from 'graphql-request';
import { Logger } from '../../utils/Logger';
import { Config } from '../../config/AppConfig';

export interface GraphQLQuery {
  query: string;
  variables?: Record<string, any>;
  operationName?: string;
}

export interface GraphQLResponse<T = any> {
  data?: T;
  errors?: Array<{
    message: string;
    locations?: Array<{ line: number; column: number }>;
    path?: string[];
  }>;
}

export interface PortfolioMetrics {
  totalValue: number;
  totalPnl: number;
  totalPnlPercentage: number;
  dailyPnl: number;
  dailyPnlPercentage: number;
  volatility: number;
  sharpeRatio: number;
  maxDrawdown: number;
  beta: number;
  alpha: number;
}

export interface MarketInsight {
  type: 'trend' | 'volatility' | 'volume' | 'correlation';
  value: number;
  description: string;
  confidence: number;
  timeframe: string;
  timestamp: Date;
}

export interface YieldOpportunity {
  protocol: string;
  token: string;
  apy: number;
  riskScore: number;
  tvl: number;
  minimumAmount: string;
  liquidity: number;
  description: string;
}

export class GraphQLService {
  private static instance: GraphQLService;
  private graphqlClient: GraphQLClient;
  private logger = Logger.getInstance();
  private config = Config.getConfig();

  private constructor() {
    this.graphqlClient = new GraphQLClient(this.config.envio.graphqlEndpoint, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.envio.apiKey}`,
      },
    });
  }

  public static getInstance(): GraphQLService {
    if (!GraphQLService.instance) {
      GraphQLService.instance = new GraphQLService();
    }
    return GraphQLService.instance;
  }

  /**
   * Execute GraphQL query
   */
  public async query<T = any>(query: GraphQLQuery): Promise<GraphQLResponse<T>> {
    try {
      this.logger.logEnvio('GraphQL', 'query_executed', {
        operationName: query.operationName,
        variablesCount: Object.keys(query.variables || {}).length
      });

      const response = await this.graphqlClient.request<T>(
        query.query,
        query.variables,
        query.operationName
      );

      return { data: response };

    } catch (error) {
      this.logger.error('GraphQL query failed', error);
      
      if (error instanceof Error && error.message.includes('GraphQL')) {
        return { errors: [{ message: error.message }] };
      }
      
      throw error;
    }
  }

  /**
   * Get comprehensive portfolio metrics
   */
  public async getPortfolioMetrics(
    userId: string,
    timeframe: '1d' | '7d' | '30d' | '90d' | '1y' = '30d'
  ): Promise<PortfolioMetrics> {
    try {
      const query = gql`
        query GetPortfolioMetrics($userId: String!, $timeframe: String!) {
          portfolioMetrics(
            where: { userId: $userId, timeframe: $timeframe }
            orderBy: timestamp
            orderDirection: desc
            first: 1
          ) {
            totalValue
            totalPnl
            totalPnlPercentage
            dailyPnl
            dailyPnlPercentage
            volatility
            sharpeRatio
            maxDrawdown
            beta
            alpha
            timestamp
          }
        }
      `;

      const response = await this.query<{ portfolioMetrics: Array<PortfolioMetrics & { timestamp: string }> }>({
        query,
        variables: { userId, timeframe },
        operationName: 'GetPortfolioMetrics'
      });

      if (response.errors) {
        throw new Error(`GraphQL errors: ${response.errors.map(e => e.message).join(', ')}`);
      }

      const metrics = response.data?.portfolioMetrics[0];
      if (!metrics) {
        return this.getDefaultPortfolioMetrics();
      }

      return {
        totalValue: metrics.totalValue,
        totalPnl: metrics.totalPnl,
        totalPnlPercentage: metrics.totalPnlPercentage,
        dailyPnl: metrics.dailyPnl,
        dailyPnlPercentage: metrics.dailyPnlPercentage,
        volatility: metrics.volatility,
        sharpeRatio: metrics.sharpeRatio,
        maxDrawdown: metrics.maxDrawdown,
        beta: metrics.beta,
        alpha: metrics.alpha
      };

    } catch (error) {
      this.logger.error('Failed to get portfolio metrics', error, { userId, timeframe });
      return this.getDefaultPortfolioMetrics();
    }
  }

  /**
   * Get market insights and analysis
   */
  public async getMarketInsights(
    tokens: string[],
    timeframe: '1h' | '4h' | '1d' | '1w' = '1d'
  ): Promise<MarketInsight[]> {
    try {
      const query = gql`
        query GetMarketInsights($tokens: [String!]!, $timeframe: String!) {
          marketInsights(
            where: { 
              tokens_contains: $tokens,
              timeframe: $timeframe
            }
            orderBy: timestamp
            orderDirection: desc
            first: 100
          ) {
            type
            value
            description
            confidence
            timeframe
            timestamp
          }
        }
      `;

      const response = await this.query<{ marketInsights: Array<MarketInsight & { timestamp: string }> }>({
        query,
        variables: { tokens, timeframe },
        operationName: 'GetMarketInsights'
      });

      if (response.errors) {
        throw new Error(`GraphQL errors: ${response.errors.map(e => e.message).join(', ')}`);
      }

      return (response.data?.marketInsights || []).map(insight => ({
        ...insight,
        timestamp: new Date(insight.timestamp)
      }));

    } catch (error) {
      this.logger.error('Failed to get market insights', error, { tokens, timeframe });
      return [];
    }
  }

  /**
   * Get yield farming opportunities
   */
  public async getYieldOpportunities(
    minApy: number = 0.05,
    maxRisk: number = 0.7,
    minTvl: number = 1000000
  ): Promise<YieldOpportunity[]> {
    try {
      const query = gql`
        query GetYieldOpportunities($minApy: BigDecimal!, $maxRisk: BigDecimal!, $minTvl: BigDecimal!) {
          yieldOpportunities(
            where: {
              apy_gte: $minApy,
              riskScore_lte: $maxRisk,
              tvl_gte: $minTvl
            }
            orderBy: apy
            orderDirection: desc
            first: 50
          ) {
            protocol
            token
            apy
            riskScore
            tvl
            minimumAmount
            liquidity
            description
            timestamp
          }
        }
      `;

      const response = await this.query<{ yieldOpportunities: Array<YieldOpportunity & { timestamp: string }> }>({
        query,
        variables: { minApy, maxRisk, minTvl },
        operationName: 'GetYieldOpportunities'
      });

      if (response.errors) {
        throw new Error(`GraphQL errors: ${response.errors.map(e => e.message).join(', ')}`);
      }

      return response.data?.yieldOpportunities || [];

    } catch (error) {
      this.logger.error('Failed to get yield opportunities', error);
      return [];
    }
  }

  /**
   * Get cross-chain arbitrage opportunities
   */
  public async getArbitrageOpportunities(
    sourceChain: string = 'ethereum',
    targetChain: string = 'monad'
  ): Promise<Array<{
    token: string;
    sourcePrice: number;
    targetPrice: number;
    priceDifference: number;
    arbitrageProfit: number;
    minimumAmount: string;
    gasCost: string;
    netProfit: number;
  }>> {
    try {
      const query = gql`
        query GetArbitrageOpportunities($sourceChain: String!, $targetChain: String!) {
          arbitrageOpportunities(
            where: {
              sourceChain: $sourceChain,
              targetChain: $targetChain,
              netProfit_gt: "0"
            }
            orderBy: netProfit
            orderDirection: desc
            first: 20
          ) {
            token
            sourcePrice
            targetPrice
            priceDifference
            arbitrageProfit
            minimumAmount
            gasCost
            netProfit
            timestamp
          }
        }
      `;

      const response = await this.query({
        query,
        variables: { sourceChain, targetChain },
        operationName: 'GetArbitrageOpportunities'
      });

      if (response.errors) {
        throw new Error(`GraphQL errors: ${response.errors.map(e => e.message).join(', ')}`);
      }

      return (response.data as any)?.arbitrageOpportunities || [];

    } catch (error) {
      this.logger.error('Failed to get arbitrage opportunities', error);
      return [];
    }
  }

  /**
   * Get DeFi protocol analytics
   */
  public async getProtocolAnalytics(
    protocol: string,
    timeframe: '1d' | '7d' | '30d' = '7d'
  ): Promise<{
    tvl: number;
    volume24h: number;
    fees24h: number;
    users24h: number;
    transactions24h: number;
    apy: number;
    riskScore: number;
  }> {
    try {
      const query = gql`
        query GetProtocolAnalytics($protocol: String!, $timeframe: String!) {
          protocolAnalytics(
            where: { protocol: $protocol, timeframe: $timeframe }
            orderBy: timestamp
            orderDirection: desc
            first: 1
          ) {
            tvl
            volume24h
            fees24h
            users24h
            transactions24h
            apy
            riskScore
            timestamp
          }
        }
      `;

      const response = await this.query({
        query,
        variables: { protocol, timeframe },
        operationName: 'GetProtocolAnalytics'
      });

      if (response.errors) {
        throw new Error(`GraphQL errors: ${response.errors.map(e => e.message).join(', ')}`);
      }

      const analytics = (response.data as any)?.protocolAnalytics[0];
      
      if (!analytics) {
        return {
          tvl: 0,
          volume24h: 0,
          fees24h: 0,
          users24h: 0,
          transactions24h: 0,
          apy: 0,
          riskScore: 0.5
        };
      }

      return {
        tvl: analytics.tvl,
        volume24h: analytics.volume24h,
        fees24h: analytics.fees24h,
        users24h: analytics.users24h,
        transactions24h: analytics.transactions24h,
        apy: analytics.apy,
        riskScore: analytics.riskScore
      };

    } catch (error) {
      this.logger.error('Failed to get protocol analytics', error, { protocol });
      throw error;
    }
  }

  /**
   * Get liquidity pool analytics
   */
  public async getLiquidityPoolAnalytics(
    poolAddress: string,
    timeframe: '1d' | '7d' | '30d' = '7d'
  ): Promise<{
    address: string;
    token0: string;
    token1: string;
    reserve0: string;
    reserve1: string;
    totalSupply: string;
    apy: number;
    volume24h: number;
    fees24h: number;
    liquidity: number;
    price: number;
  }> {
    try {
      const query = gql`
        query GetLiquidityPoolAnalytics($poolAddress: String!, $timeframe: String!) {
          liquidityPoolAnalytics(
            where: { address: $poolAddress, timeframe: $timeframe }
            orderBy: timestamp
            orderDirection: desc
            first: 1
          ) {
            address
            token0
            token1
            reserve0
            reserve1
            totalSupply
            apy
            volume24h
            fees24h
            liquidity
            price
            timestamp
          }
        }
      `;

      const response = await this.query({
        query,
        variables: { poolAddress, timeframe },
        operationName: 'GetLiquidityPoolAnalytics'
      });

      if (response.errors) {
        throw new Error(`GraphQL errors: ${response.errors.map(e => e.message).join(', ')}`);
      }

      const analytics = (response.data as any)?.liquidityPoolAnalytics[0];
      
      if (!analytics) {
        throw new Error('Liquidity pool analytics not found');
      }

      return {
        address: analytics.address,
        token0: analytics.token0,
        token1: analytics.token1,
        reserve0: analytics.reserve0,
        reserve1: analytics.reserve1,
        totalSupply: analytics.totalSupply,
        apy: analytics.apy,
        volume24h: analytics.volume24h,
        fees24h: analytics.fees24h,
        liquidity: analytics.liquidity,
        price: analytics.price
      };

    } catch (error) {
      this.logger.error('Failed to get liquidity pool analytics', error, { poolAddress });
      throw error;
    }
  }

  /**
   * Get user transaction history
   */
  public async getUserTransactions(
    userAddress: string,
    limit: number = 100,
    offset: number = 0
  ): Promise<Array<{
    hash: string;
    blockNumber: number;
    timestamp: Date;
    from: string;
    to: string;
    value: string;
    gasUsed: string;
    gasPrice: string;
    status: string;
    type: string;
  }>> {
    try {
      const query = gql`
        query GetUserTransactions($userAddress: String!, $limit: Int!, $offset: Int!) {
          userTransactions(
            where: { 
              or: [
                { from: $userAddress },
                { to: $userAddress }
              ]
            }
            orderBy: timestamp
            orderDirection: desc
            first: $limit
            skip: $offset
          ) {
            hash
            blockNumber
            timestamp
            from
            to
            value
            gasUsed
            gasPrice
            status
            type
          }
        }
      `;

      const response = await this.query({
        query,
        variables: { userAddress: userAddress.toLowerCase(), limit, offset },
        operationName: 'GetUserTransactions'
      });

      if (response.errors) {
        throw new Error(`GraphQL errors: ${response.errors.map(e => e.message).join(', ')}`);
      }

      const transactions = (response.data as any)?.userTransactions || [];
      
      return transactions.map((tx: any) => ({
        ...tx,
        timestamp: new Date(tx.timestamp)
      }));

    } catch (error) {
      this.logger.error('Failed to get user transactions', error, { userAddress });
      return [];
    }
  }

  /**
   * Get portfolio performance comparison
   */
  public async getPortfolioComparison(
    userId: string,
    benchmark: string = 'ETH'
  ): Promise<{
    portfolioReturn: number;
    benchmarkReturn: number;
    alpha: number;
    beta: number;
    sharpeRatio: number;
    informationRatio: number;
    trackingError: number;
    maxDrawdown: number;
  }> {
    try {
      const query = gql`
        query GetPortfolioComparison($userId: String!, $benchmark: String!) {
          portfolioComparison(
            where: { userId: $userId, benchmark: $benchmark }
            orderBy: timestamp
            orderDirection: desc
            first: 1
          ) {
            portfolioReturn
            benchmarkReturn
            alpha
            beta
            sharpeRatio
            informationRatio
            trackingError
            maxDrawdown
            timestamp
          }
        }
      `;

      const response = await this.query({
        query,
        variables: { userId, benchmark },
        operationName: 'GetPortfolioComparison'
      });

      if (response.errors) {
        throw new Error(`GraphQL errors: ${response.errors.map(e => e.message).join(', ')}`);
      }

      const comparison = (response.data as any)?.portfolioComparison[0];
      
      if (!comparison) {
        return {
          portfolioReturn: 0,
          benchmarkReturn: 0,
          alpha: 0,
          beta: 1,
          sharpeRatio: 0,
          informationRatio: 0,
          trackingError: 0,
          maxDrawdown: 0
        };
      }

      return {
        portfolioReturn: comparison.portfolioReturn,
        benchmarkReturn: comparison.benchmarkReturn,
        alpha: comparison.alpha,
        beta: comparison.beta,
        sharpeRatio: comparison.sharpeRatio,
        informationRatio: comparison.informationRatio,
        trackingError: comparison.trackingError,
        maxDrawdown: comparison.maxDrawdown
      };

    } catch (error) {
      this.logger.error('Failed to get portfolio comparison', error, { userId, benchmark });
      throw error;
    }
  }

  // Private helper methods
  private getDefaultPortfolioMetrics(): PortfolioMetrics {
    return {
      totalValue: 0,
      totalPnl: 0,
      totalPnlPercentage: 0,
      dailyPnl: 0,
      dailyPnlPercentage: 0,
      volatility: 0,
      sharpeRatio: 0,
      maxDrawdown: 0,
      beta: 1,
      alpha: 0
    };
  }
}
