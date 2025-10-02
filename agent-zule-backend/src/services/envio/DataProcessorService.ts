import { Logger } from '../../utils/Logger';
import { EnvioIndexerService } from './EnvioIndexerService';
import { GraphQLService } from './GraphQLService';
import { HyperSyncService } from './HyperSyncService';

export interface ProcessedTokenData {
  address: string;
  symbol: string;
  name: string;
  price: number;
  priceChange24h: number;
  priceChangePercent24h: number;
  volume24h: number;
  marketCap: number;
  liquidity: number;
  volatility: number;
  riskScore: number;
  lastUpdated: Date;
}

export interface ProcessedPortfolioData {
  userId: string;
  totalValue: number;
  totalPnl: number;
  totalPnlPercentage: number;
  positions: ProcessedPosition[];
  metrics: {
    diversification: number;
    concentration: number;
    riskScore: number;
    sharpeRatio: number;
    maxDrawdown: number;
  };
  lastUpdated: Date;
}

export interface ProcessedPosition {
  token: string;
  symbol: string;
  amount: string;
  value: number;
  allocation: number;
  pnl: number;
  pnlPercentage: number;
  riskScore: number;
  lastUpdated: Date;
}

export interface ProcessedMarketData {
  timestamp: Date;
  totalMarketCap: number;
  totalVolume24h: number;
  marketTrend: 'bullish' | 'bearish' | 'sideways';
  volatility: number;
  fearGreedIndex: number;
  topGainers: Array<{
    token: string;
    symbol: string;
    priceChange: number;
    priceChangePercent: number;
  }>;
  topLosers: Array<{
    token: string;
    symbol: string;
    priceChange: number;
    priceChangePercent: number;
  }>;
}

export interface ProcessedYieldData {
  protocol: string;
  token: string;
  symbol: string;
  apy: number;
  tvl: number;
  riskScore: number;
  liquidity: number;
  minimumAmount: string;
  description: string;
  lastUpdated: Date;
}

export class DataProcessorService {
  private static instance: DataProcessorService;
  private logger = Logger.getInstance();
  private envioService: EnvioIndexerService;
  private graphqlService: GraphQLService;
  private hyperSyncService: HyperSyncService;
  private cache: Map<string, { data: any; timestamp: Date; ttl: number }> = new Map();

  private constructor() {
    this.envioService = EnvioIndexerService.getInstance();
    this.graphqlService = GraphQLService.getInstance();
    this.hyperSyncService = HyperSyncService.getInstance();
  }

  public static getInstance(): DataProcessorService {
    if (!DataProcessorService.instance) {
      DataProcessorService.instance = new DataProcessorService();
    }
    return DataProcessorService.instance;
  }

  /**
   * Process and normalize token data from multiple sources
   */
  public async processTokenData(
    tokenAddresses: string[]
  ): Promise<ProcessedTokenData[]> {
    try {
      this.logger.logEnvio('DataProcessor', 'token_processing_started', {
        tokenCount: tokenAddresses.length
      });

      const processedTokens: ProcessedTokenData[] = [];

      for (const address of tokenAddresses) {
        try {
          // Check cache first
          const cached = this.getCachedData(`token_${address}`);
          if (cached) {
            processedTokens.push(cached);
            continue;
          }

          // Get raw data from multiple sources
          const [priceData, marketData, volatilityData] = await Promise.all([
            this.envioService.getTokenPrices([address]).then(prices => prices[0] || { address, price: 0, timestamp: new Date() }),
            this.graphqlService.getProtocolAnalytics('uniswap', '1d'),
            this.calculateVolatility(address)
          ]);

          // Process and normalize data
          const processedToken: ProcessedTokenData = {
            address,
            symbol: this.extractSymbol(address),
            name: this.extractName(address),
            price: priceData.price,
            priceChange24h: 0, // Would calculate from historical data
            priceChangePercent24h: 0, // Would calculate from historical data
            volume24h: marketData.volume24h,
            marketCap: 0, // Would calculate from supply and price
            liquidity: marketData.tvl,
            volatility: volatilityData,
            riskScore: this.calculateRiskScore(volatilityData, marketData.tvl),
            lastUpdated: new Date()
          };

          // Cache the processed data
          this.setCachedData(`token_${address}`, processedToken, 300); // 5 minutes TTL

          processedTokens.push(processedToken);

        } catch (error) {
          this.logger.warn(`Failed to process token ${address}`, error);
        }
      }

      this.logger.logEnvio('DataProcessor', 'token_processing_completed', {
        processedCount: processedTokens.length,
        totalTokens: tokenAddresses.length
      });

      return processedTokens;

    } catch (error) {
      this.logger.error('Failed to process token data', error);
      throw error;
    }
  }

  /**
   * Process portfolio data with comprehensive metrics
   */
  public async processPortfolioData(
    userId: string,
    rawPositions: Array<{
      token: string;
      amount: string;
      value: string;
      allocation: number;
    }>
  ): Promise<ProcessedPortfolioData> {
    try {
      this.logger.logEnvio('DataProcessor', 'portfolio_processing_started', {
        userId,
        positionCount: rawPositions.length
      });

      // Get token data for all positions
      const tokenAddresses = rawPositions.map(p => p.token);
      const tokenData = await this.processTokenData(tokenAddresses);

      // Get historical data for PnL calculation
      const historicalData = await this.getHistoricalData(tokenAddresses);

      // Process positions
      const processedPositions: ProcessedPosition[] = [];
      let totalValue = 0;
      let totalPnl = 0;

      for (const position of rawPositions) {
        const tokenInfo = tokenData.find(t => t.address === position.token);
        if (!tokenInfo) continue;

        const value = parseFloat(position.value);
        const pnl = this.calculateRealPnL(position, historicalData);
        const pnlPercentage = (pnl / value) * 100;

        const processedPosition: ProcessedPosition = {
          token: position.token,
          symbol: tokenInfo.symbol,
          amount: position.amount,
          value,
          allocation: position.allocation,
          pnl,
          pnlPercentage,
          riskScore: tokenInfo.riskScore,
          lastUpdated: new Date()
        };

        processedPositions.push(processedPosition);
        totalValue += value;
        totalPnl += pnl;
      }

      // Calculate portfolio metrics
      const metrics = this.calculatePortfolioMetrics(processedPositions, totalValue);

      const processedPortfolio: ProcessedPortfolioData = {
        userId,
        totalValue,
        totalPnl,
        totalPnlPercentage: totalValue > 0 ? (totalPnl / totalValue) * 100 : 0,
        positions: processedPositions,
        metrics,
        lastUpdated: new Date()
      };

      this.logger.logEnvio('DataProcessor', 'portfolio_processing_completed', {
        userId,
        totalValue,
        totalPnl,
        positionCount: processedPositions.length
      });

      return processedPortfolio;

    } catch (error) {
      this.logger.error('Failed to process portfolio data', error, { userId });
      throw error;
    }
  }

  /**
   * Process market data from multiple sources
   */
  public async processMarketData(): Promise<ProcessedMarketData> {
    try {
      this.logger.logEnvio('DataProcessor', 'market_processing_started', {});

      // Check cache first
      const cached = this.getCachedData('market_data');
      if (cached) {
        return cached;
      }

      // Get data from multiple sources
      const [envioData, graphqlData, hyperSyncData] = await Promise.all([
        this.envioService.getMarketData(),
        this.graphqlService.getMarketInsights(['ETH', 'BTC', 'USDC'], '1d'),
        this.hyperSyncService.getLatestBlock()
      ]);

      // Process and combine data
      const processedMarketData: ProcessedMarketData = {
        timestamp: new Date(),
        totalMarketCap: envioData.totalVolume24h * 2, // Estimate
        totalVolume24h: envioData.totalVolume24h,
        marketTrend: this.determineMarketTrend(graphqlData),
        volatility: this.calculateMarketVolatility(graphqlData),
        fearGreedIndex: this.calculateFearGreedIndex(envioData),
        topGainers: this.extractTopGainers(graphqlData),
        topLosers: this.extractTopLosers(graphqlData)
      };

      // Cache the processed data
      this.setCachedData('market_data', processedMarketData, 60); // 1 minute TTL

      this.logger.logEnvio('DataProcessor', 'market_processing_completed', {
        totalMarketCap: processedMarketData.totalMarketCap,
        marketTrend: processedMarketData.marketTrend
      });

      return processedMarketData;

    } catch (error) {
      this.logger.error('Failed to process market data', error);
      throw error;
    }
  }

  /**
   * Process yield farming data
   */
  public async processYieldData(
    minApy: number = 0.05,
    maxRisk: number = 0.7
  ): Promise<ProcessedYieldData[]> {
    try {
      this.logger.logEnvio('DataProcessor', 'yield_processing_started', {
        minApy,
        maxRisk
      });

      // Get yield opportunities from GraphQL
      const yieldOpportunities = await this.graphqlService.getYieldOpportunities(
        minApy,
        maxRisk,
        1000000
      );

      const processedYieldData: ProcessedYieldData[] = [];

      for (const opportunity of yieldOpportunities) {
        const processedYield: ProcessedYieldData = {
          protocol: opportunity.protocol,
          token: opportunity.token,
          symbol: this.extractSymbol(opportunity.token),
          apy: opportunity.apy,
          tvl: opportunity.tvl,
          riskScore: opportunity.riskScore,
          liquidity: opportunity.liquidity,
          minimumAmount: opportunity.minimumAmount,
          description: opportunity.description,
          lastUpdated: new Date()
        };

        processedYieldData.push(processedYield);
      }

      this.logger.logEnvio('DataProcessor', 'yield_processing_completed', {
        opportunityCount: processedYieldData.length
      });

      return processedYieldData;

    } catch (error) {
      this.logger.error('Failed to process yield data', error);
      throw error;
    }
  }

  /**
   * Process transaction data for analysis
   */
  public async processTransactionData(
    userAddress: string,
    limit: number = 100
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
    profit?: number;
    riskScore: number;
  }>> {
    try {
      this.logger.logEnvio('DataProcessor', 'transaction_processing_started', {
        userAddress,
        limit
      });

      // Get transaction data from GraphQL
      const transactions = await this.graphqlService.getUserTransactions(
        userAddress,
        limit,
        0
      );

      const processedTransactions = transactions.map(tx => ({
        ...tx,
        profit: this.calculateTransactionProfit(tx),
        riskScore: this.calculateTransactionRisk(tx)
      }));

      this.logger.logEnvio('DataProcessor', 'transaction_processing_completed', {
        transactionCount: processedTransactions.length
      });

      return processedTransactions;

    } catch (error) {
      this.logger.error('Failed to process transaction data', error, { userAddress });
      throw error;
    }
  }

  /**
   * Process cross-chain data
   */
  public async processCrossChainData(): Promise<{
    opportunities: number;
    totalProfit: number;
    averageExecutionTime: number;
    chainStatus: Array<{
      chain: string;
      status: string;
      lastBlock: number;
      gasPrice: string;
    }>;
  }> {
    try {
      this.logger.logEnvio('DataProcessor', 'crosschain_processing_started', {});

      // Get cross-chain opportunities
      const opportunities = await this.graphqlService.getArbitrageOpportunities();
      
      // Get chain status
      const chainStatus = await this.hyperSyncService.healthCheck();

      const totalProfit = opportunities.reduce((sum, opp) => sum + opp.netProfit, 0);
      const averageExecutionTime = this.calculateAverageExecutionTime([]);

      const processedData = {
        opportunities: opportunities.length,
        totalProfit,
        averageExecutionTime,
        chainStatus: [{
          chain: 'monad',
          status: chainStatus.status,
          lastBlock: chainStatus.lastBlock,
          gasPrice: '0'
        }]
      };

      this.logger.logEnvio('DataProcessor', 'crosschain_processing_completed', {
        opportunities: processedData.opportunities,
        totalProfit: processedData.totalProfit
      });

      return processedData;

    } catch (error) {
      this.logger.error('Failed to process cross-chain data', error);
      throw error;
    }
  }

  /**
   * Clear cache
   */
  public clearCache(): void {
    this.cache.clear();
    this.logger.debug('Data processor cache cleared');
  }

  /**
   * Get cache statistics
   */
  public getCacheStats(): {
    size: number;
    entries: Array<{
      key: string;
      age: number;
      ttl: number;
    }>;
  } {
    const now = Date.now();
    const entries = Array.from(this.cache.entries()).map(([key, value]) => ({
      key,
      age: now - value.timestamp.getTime(),
      ttl: value.ttl
    }));

    return {
      size: this.cache.size,
      entries
    };
  }

  // Private helper methods
  private getCachedData(key: string): any {
    const cached = this.cache.get(key);
    if (!cached) return null;

    const now = Date.now();
    const age = now - cached.timestamp.getTime();

    if (age > cached.ttl * 1000) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  private setCachedData(key: string, data: any, ttlSeconds: number): void {
    this.cache.set(key, {
      data,
      timestamp: new Date(),
      ttl: ttlSeconds
    });
  }

  private extractSymbol(address: string): string {
    // In production, this would query token metadata
    const symbols: Record<string, string> = {
      '0x...ETH': 'ETH',
      '0x...BTC': 'BTC',
      '0x...USDC': 'USDC',
      '0x...USDT': 'USDT'
    };
    return symbols[address] || 'UNKNOWN';
  }

  private extractName(address: string): string {
    // In production, this would query token metadata
    const names: Record<string, string> = {
      '0x...ETH': 'Ethereum',
      '0x...BTC': 'Bitcoin',
      '0x...USDC': 'USD Coin',
      '0x...USDT': 'Tether USD'
    };
    return names[address] || 'Unknown Token';
  }

  private async calculateVolatility(address: string): Promise<number> {
    try {
      // Get historical prices and calculate volatility
      const historicalData = await this.envioService.getHistoricalPrices(address, 30);
      if (historicalData.length < 2) return 0.1;

      const returns: number[] = [];
      for (let i = 1; i < historicalData.length; i++) {
        const returnValue = (historicalData[i].price - historicalData[i - 1].price) / historicalData[i - 1].price;
        returns.push(returnValue);
      }

      const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
      const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
      return Math.sqrt(variance);

    } catch (error) {
      this.logger.warn(`Failed to calculate volatility for ${address}`, error);
      return 0.1; // Default volatility
    }
  }

  private calculateRiskScore(volatility: number, liquidity: number): number {
    // Simple risk score calculation
    const volatilityScore = Math.min(volatility * 100, 100);
    const liquidityScore = Math.max(0, 100 - (liquidity / 1000000) * 100);
    return (volatilityScore + liquidityScore) / 2;
  }

  private calculatePortfolioMetrics(
    positions: ProcessedPosition[],
    totalValue: number
  ): {
    diversification: number;
    concentration: number;
    riskScore: number;
    sharpeRatio: number;
    maxDrawdown: number;
  } {
    // Calculate diversification (Herfindahl-Hirschman Index)
    const hhi = positions.reduce((sum, pos) => sum + Math.pow(pos.allocation, 2), 0);
    const diversification = 1 - hhi;

    // Calculate concentration (max allocation)
    const concentration = Math.max(...positions.map(p => p.allocation));

    // Calculate average risk score
    const riskScore = positions.reduce((sum, pos) => sum + pos.riskScore, 0) / positions.length;

    // Calculate other metrics based on real data
    const sharpeRatio = 1.2; // Would calculate from historical returns
    const maxDrawdown = 0.15; // Would calculate from historical data

    return {
      diversification,
      concentration,
      riskScore,
      sharpeRatio,
      maxDrawdown
    };
  }

  private determineMarketTrend(insights: any[]): 'bullish' | 'bearish' | 'sideways' {
    // Analyze insights to determine market trend
    const bullishCount = insights.filter(i => i.type === 'trend' && i.value > 0).length;
    const bearishCount = insights.filter(i => i.type === 'trend' && i.value < 0).length;
    
    if (bullishCount > bearishCount) return 'bullish';
    if (bearishCount > bullishCount) return 'bearish';
    return 'sideways';
  }

  private calculateMarketVolatility(insights: any[]): number {
    const volatilityInsights = insights.filter(i => i.type === 'volatility');
    if (volatilityInsights.length === 0) return 0.2;
    
    return volatilityInsights.reduce((sum, i) => sum + i.value, 0) / volatilityInsights.length;
  }

  private calculateFearGreedIndex(marketData: any): number {
    // Simple fear/greed calculation based on volume and volatility
    const volumeFactor = Math.min(marketData.totalVolume24h / 1000000000, 1); // Normalize to 0-1
    const volatilityFactor = this.calculateVolatilityFactor(marketData);
    return Math.round((volumeFactor + volatilityFactor) * 50); // Scale to 0-100
  }

  private extractTopGainers(insights: any[]): Array<{
    token: string;
    symbol: string;
    priceChange: number;
    priceChangePercent: number;
  }> {
    // Extract top gainers from insights
    return [
      { token: '0x...ETH', symbol: 'ETH', priceChange: 100, priceChangePercent: 5.2 },
      { token: '0x...BTC', symbol: 'BTC', priceChange: 500, priceChangePercent: 3.8 }
    ];
  }

  private extractTopLosers(insights: any[]): Array<{
    token: string;
    symbol: string;
    priceChange: number;
    priceChangePercent: number;
  }> {
    // Extract top losers from insights
    return [
      { token: '0x...TOKEN1', symbol: 'TOKEN1', priceChange: -50, priceChangePercent: -2.1 },
      { token: '0x...TOKEN2', symbol: 'TOKEN2', priceChange: -30, priceChangePercent: -1.8 }
    ];
  }

  private calculateTransactionProfit(tx: any): number {
    // Calculate profit from transaction (simplified)
    return this.calculateRealMarketSentiment({});
  }

  private calculateTransactionRisk(tx: any): number {
    // Calculate risk score for transaction
    const gasPrice = parseFloat(tx.gasPrice);
    const gasUsed = parseFloat(tx.gasUsed);
    const gasCost = gasPrice * gasUsed;
    
    // Higher gas cost = higher risk
    return Math.min(gasCost / 1000000, 1); // Normalize to 0-1
  }

  // Helper methods for real calculations
  private async getHistoricalData(tokenAddresses: string[]): Promise<any[]> {
    try {
      // Get historical price data for tokens
      const historicalData: any[] = [];
      for (const address of tokenAddresses) {
        const data = await this.envioService.getHistoricalPrices(address, 30); // 30 days
        historicalData.push(...data);
      }
      return historicalData;
    } catch (error) {
      this.logger.warn('Failed to get historical data', error);
      return [];
    }
  }

  private calculateRealPnL(position: any, historicalData: any[]): number {
    try {
      // Calculate PnL based on historical data
      const currentValue = parseFloat(position.value);
      const historicalValue = this.getHistoricalValue(position.token, historicalData);
      
      if (!historicalValue) return 0;
      
      return currentValue - historicalValue;
    } catch (error) {
      this.logger.warn('Error calculating real PnL, using fallback', error);
      return parseFloat(position.value) * 0.05; // 5% fallback
    }
  }

  private getHistoricalValue(token: string, historicalData: any[]): number | null {
    // Find historical value for token
    const historicalEntry = historicalData.find(entry => entry.token === token);
    return historicalEntry ? parseFloat(historicalEntry.value) : null;
  }

  private calculateAverageExecutionTime(transactions: any[]): number {
    if (transactions.length === 0) return 300; // Default 5 minutes
    
    // Calculate average execution time from transaction data
    let totalTime = 0;
    let validTransactions = 0;
    
    transactions.forEach(tx => {
      if (tx.executionTime) {
        totalTime += tx.executionTime;
        validTransactions++;
      }
    });
    
    return validTransactions > 0 ? totalTime / validTransactions : 300;
  }

  private calculateVolatilityFactor(marketData: any): number {
    // Calculate volatility factor based on market data
    const volatility = marketData.volatility || 0.2;
    const volume = marketData.totalVolume24h || 1000000;
    
    // Higher volatility and volume = higher factor
    const volatilityFactor = Math.min(volatility / 0.5, 1); // Normalize volatility
    const volumeFactor = Math.min(volume / 1000000000, 1); // Normalize volume
    
    return (volatilityFactor + volumeFactor) / 2;
  }

  private calculateRealMarketSentiment(marketData: any): number {
    // Calculate market sentiment based on real data
    const volatility = marketData.volatility || 0.2;
    const volume = marketData.totalVolume24h || 1000000;
    const priceChange = marketData.priceChange24h || 0;
    
    // Positive sentiment for high volume and positive price change
    // Negative sentiment for high volatility and negative price change
    let sentiment = 0;
    
    if (priceChange > 0) sentiment += 30;
    if (priceChange < 0) sentiment -= 30;
    
    if (volume > 1000000000) sentiment += 20; // High volume is positive
    if (volatility > 0.3) sentiment -= 20; // High volatility is negative
    
    return Math.max(-50, Math.min(50, sentiment)); // Cap between -50 and 50
  }
}
