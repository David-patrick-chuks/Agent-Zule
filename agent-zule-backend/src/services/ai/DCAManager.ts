import { MarketCondition, TokenInfo } from '../../types/Common';
import { Portfolio, Position } from '../../types/Portfolio';
import { Logger } from '../../utils/Logger';

export interface DCAStrategy {
  id: string;
  name: string;
  description: string;
  type: 'time_based' | 'price_based' | 'volatility_based' | 'hybrid';
  parameters: DCAParameters;
  isActive: boolean;
  createdAt: Date;
  lastExecuted?: Date;
  nextExecution?: Date;
}

export interface DCAParameters {
  type?: 'time_based' | 'price_based' | 'volatility_based' | 'hybrid';
  // Time-based parameters
  frequency?: 'hourly' | 'daily' | 'weekly' | 'monthly';
  intervals?: number; // Number of intervals to execute
  
  // Price-based parameters
  priceThreshold?: number; // Price change threshold to trigger DCA
  priceDirection?: 'up' | 'down' | 'both';
  
  // Volatility-based parameters
  volatilityThreshold?: number; // Volatility threshold
  volatilityWindow?: number; // Time window for volatility calculation (hours)
  
  // Amount parameters
  amountPerExecution: string; // Amount to invest per execution
  maxTotalAmount?: string; // Maximum total amount to invest
  minExecutionInterval?: number; // Minimum time between executions (hours)
  
  // Risk management
  stopLossPercentage?: number; // Stop loss threshold
  takeProfitPercentage?: number; // Take profit threshold
  maxPositionSize?: number; // Maximum position size as % of portfolio
}

export interface DCAExecution {
  id: string;
  strategyId: string;
  portfolioId: string;
  token: TokenInfo;
  amount: string;
  price: number;
  timestamp: Date;
  reason: string;
  marketCondition: MarketCondition;
  success: boolean;
  transactionHash?: string;
  gasUsed?: number;
}

export interface DCAAnalysis {
  strategyId: string;
  totalInvested: number;
  totalValue: number;
  totalReturn: number;
  totalReturnPercentage: number;
  averageEntryPrice: number;
  currentPrice: number;
  executionsCount: number;
  successRate: number;
  averageGasCost: number;
  recommendations: string[];
}

export interface DCARecommendation {
  id: string;
  type: 'create_strategy' | 'modify_strategy' | 'pause_strategy' | 'resume_strategy' | 'stop_strategy';
  token: TokenInfo;
  strategy: Partial<DCAStrategy>;
  reasoning: string;
  expectedImpact: number;
  riskLevel: 'low' | 'medium' | 'high';
  priority: 'low' | 'medium' | 'high';
  confidence: number;
}

export class DCAManager {
  private static instance: DCAManager;
  private logger = Logger.getInstance();

  private constructor() {}

  public static getInstance(): DCAManager {
    if (!DCAManager.instance) {
      DCAManager.instance = new DCAManager();
    }
    return DCAManager.instance;
  }

  /**
   * Create a new DCA strategy for a portfolio
   */
  public async createStrategy(
    portfolioId: string,
    token: TokenInfo,
    parameters: DCAParameters,
    strategyType: DCAStrategy['type'] = 'time_based'
  ): Promise<DCAStrategy> {
    try {
      this.logger.logAI('DCAManager', 'strategy_created', {
        portfolioId,
        token: token.symbol,
        strategyType,
        parameters
      });

      const strategy: DCAStrategy = {
        id: this.generateStrategyId(),
        name: `${token.symbol} DCA Strategy`,
        description: `Dollar Cost Averaging strategy for ${token.symbol}`,
        type: strategyType,
        parameters,
        isActive: true,
        createdAt: new Date(),
        nextExecution: this.calculateNextExecution(parameters, strategyType)
      };

      // Validate strategy parameters
      this.validateStrategyParameters(strategy);

      return strategy;

    } catch (error) {
      this.logger.error('Failed to create DCA strategy', error, {
        portfolioId,
        token: token.symbol
      });
      throw error;
    }
  }

  /**
   * Analyze portfolio and generate DCA recommendations
   */
  public async analyzeAndRecommend(
    portfolio: Portfolio,
    marketData: MarketCondition
  ): Promise<DCARecommendation[]> {
    try {
      this.logger.logAI('DCAManager', 'analysis_started', {
        portfolioId: portfolio.id,
        marketCondition: marketData.trend
      });

      const recommendations: DCARecommendation[] = [];

      // Analyze each position for DCA opportunities
      for (const position of portfolio.positions) {
        const positionRecommendations = await this.analyzePositionForDCA(
          position,
          portfolio,
          marketData
        );
        recommendations.push(...positionRecommendations);
      }

      // Analyze market conditions for new DCA opportunities
      const marketRecommendations = await this.analyzeMarketForDCA(portfolio, marketData);
      recommendations.push(...marketRecommendations);

      // Sort by priority and confidence
      return recommendations.sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
          return priorityOrder[b.priority] - priorityOrder[a.priority];
        }
        return b.confidence - a.confidence;
      });

    } catch (error) {
      this.logger.error('Failed to analyze and recommend DCA strategies', error);
      return [];
    }
  }

  /**
   * Execute DCA strategy
   */
  public async executeStrategy(
    strategy: DCAStrategy,
    portfolio: Portfolio,
    marketData: MarketCondition
  ): Promise<DCAExecution | null> {
    try {
      // Check if strategy should execute
      if (!this.shouldExecuteStrategy(strategy, marketData)) {
        return null;
      }

      const token = await this.getTokenForStrategy(strategy, portfolio);
      if (!token) {
        this.logger.warn('No suitable token found for DCA strategy', {
          strategyId: strategy.id
        });
        return null;
      }

      // Calculate execution amount
      const amount = this.calculateExecutionAmount(strategy, portfolio, token);
      if (parseFloat(amount) <= 0) {
        return null;
      }

      // Create execution record
      const execution: DCAExecution = {
        id: this.generateExecutionId(),
        strategyId: strategy.id,
        portfolioId: portfolio.id,
        token,
        amount,
        price: token.price,
        timestamp: new Date(),
        reason: this.generateExecutionReason(strategy, marketData),
        marketCondition: marketData,
        success: false // Will be updated when transaction completes
      };

      this.logger.logAI('DCAManager', 'execution_created', {
        executionId: execution.id,
        strategyId: strategy.id,
        token: token.symbol,
        amount
      });

      return execution;

    } catch (error) {
      this.logger.error('Failed to execute DCA strategy', error, {
        strategyId: strategy.id
      });
      return null;
    }
  }

  /**
   * Analyze DCA strategy performance
   */
  public async analyzeStrategyPerformance(
    strategy: DCAStrategy,
    executions: DCAExecution[]
  ): Promise<DCAAnalysis> {
    try {
      const successfulExecutions = executions.filter(e => e.success);
      const totalInvested = successfulExecutions.reduce((sum, e) => sum + (parseFloat(e.amount) * e.price), 0);
      const totalValue = this.calculateCurrentValue(successfulExecutions);
      const totalReturn = totalValue - totalInvested;
      const totalReturnPercentage = totalInvested > 0 ? (totalReturn / totalInvested) * 100 : 0;
      
      const averageEntryPrice = totalInvested / successfulExecutions.reduce((sum, e) => sum + parseFloat(e.amount), 0);
      const currentPrice = successfulExecutions.length > 0 ? successfulExecutions[0].token.price : 0;
      
      const successRate = executions.length > 0 ? (successfulExecutions.length / executions.length) * 100 : 0;
      const averageGasCost = executions.reduce((sum, e) => sum + (e.gasUsed || 0), 0) / executions.length;

      const recommendations = this.generatePerformanceRecommendations(
        strategy,
        totalReturnPercentage,
        successRate,
        executions.length
      );

      return {
        strategyId: strategy.id,
        totalInvested,
        totalValue,
        totalReturn,
        totalReturnPercentage,
        averageEntryPrice,
        currentPrice,
        executionsCount: executions.length,
        successRate,
        averageGasCost,
        recommendations
      };

    } catch (error) {
      this.logger.error('Failed to analyze strategy performance', error, {
        strategyId: strategy.id
      });
      throw error;
    }
  }

  // Private helper methods
  private analyzePositionForDCA(
    position: Position,
    portfolio: Portfolio,
    marketData: MarketCondition
  ): DCARecommendation[] {
    const recommendations: DCARecommendation[] = [];

    // Check if position is suitable for DCA
    if (this.isPositionSuitableForDCA(position, marketData)) {
      const strategy = this.createRecommendedStrategy(position, marketData);
      
      recommendations.push({
        id: this.generateRecommendationId(),
        type: 'create_strategy',
        token: position.token,
        strategy,
        reasoning: this.generateDCAReasoning(position, marketData),
        expectedImpact: this.calculateExpectedImpact(position, strategy),
        riskLevel: this.calculateRiskLevel(position, marketData),
        priority: this.calculatePriority(position, marketData),
        confidence: this.calculateConfidence(position, marketData)
      });
    }

    return recommendations;
  }

  private async analyzeMarketForDCA(
    portfolio: Portfolio,
    marketData: MarketCondition
  ): Promise<DCARecommendation[]> {
    const recommendations: DCARecommendation[] = [];

    // Market conditions analysis
    if (marketData.trend === 'bearish' && marketData.volatility > 0.3) {
      // Bear market with high volatility - good time for DCA
      recommendations.push({
        id: this.generateRecommendationId(),
        type: 'create_strategy',
        token: this.getRecommendedTokenForBearMarket(),
        strategy: this.createBearMarketStrategy(),
        reasoning: 'Bear market with high volatility presents good DCA opportunities',
        expectedImpact: 0.15, // 15% expected improvement
        riskLevel: 'medium',
        priority: 'high',
        confidence: 0.8
      });
    }

    return recommendations;
  }

  private isPositionSuitableForDCA(position: Position, marketData: MarketCondition): boolean {
    // Check position size
    if (position.allocation < 0.05) return false; // Too small
    
    // Check if token is volatile enough
    if (marketData.volatility < 0.2) return false; // Too stable
    
    // Check market trend
    if (marketData.trend === 'sideways' && marketData.volatility > 0.25) return true;
    if (marketData.trend === 'bearish') return true;
    
    return false;
  }

  private createRecommendedStrategy(position: Position, marketData: MarketCondition): Partial<DCAStrategy> {
    const parameters: DCAParameters = {
      amountPerExecution: (position.value * 0.1).toString(), // 10% of position value
      maxTotalAmount: (position.value * 2).toString(), // 2x current position
      minExecutionInterval: 24, // 24 hours minimum
      maxPositionSize: position.allocation * 1.5 // 1.5x current allocation
    };

    // Adjust based on market conditions
    if (marketData.trend === 'bearish') {
      parameters.frequency = 'daily';
      parameters.volatilityThreshold = 0.3;
      parameters.type = 'volatility_based';
    } else {
      parameters.frequency = 'weekly';
      parameters.priceThreshold = 0.1; // 10% price change
      parameters.type = 'price_based';
    }

    return {
      name: `${position.token.symbol} DCA`,
      type: parameters.type as DCAStrategy['type'],
      parameters
    };
  }

  private generateDCAReasoning(position: Position, marketData: MarketCondition): string {
    const reasons: string[] = [];
    
    if (marketData.trend === 'bearish') {
      reasons.push('Bear market provides good entry opportunities');
    }
    
    if (marketData.volatility > 0.3) {
      reasons.push('High volatility creates price averaging opportunities');
    }
    
    if (position.allocation < 0.15) {
      reasons.push('Position size allows for gradual scaling');
    }
    
    return reasons.join('. ') + '.';
  }

  private calculateExpectedImpact(position: Position, strategy: Partial<DCAStrategy>): number {
    // Simplified expected impact calculation
    const baseImpact = 0.1; // 10% base improvement
    const volatilityBonus = 0.05; // 5% bonus for volatile conditions
    const sizeBonus = position.allocation < 0.1 ? 0.03 : 0; // 3% bonus for smaller positions
    
    return baseImpact + volatilityBonus + sizeBonus;
  }

  private calculateRiskLevel(position: Position, marketData: MarketCondition): 'low' | 'medium' | 'high' {
    if (marketData.volatility > 0.4) return 'high';
    if (position.allocation > 0.2) return 'medium';
    return 'low';
  }

  private calculatePriority(position: Position, marketData: MarketCondition): 'low' | 'medium' | 'high' {
    if (marketData.trend === 'bearish' && marketData.volatility > 0.3) return 'high';
    if (marketData.volatility > 0.25) return 'medium';
    return 'low';
  }

  private calculateConfidence(position: Position, marketData: MarketCondition): number {
    let confidence = 0.7; // Base confidence
    
    if (marketData.volatility > 0.3) confidence += 0.1;
    if (position.allocation < 0.15) confidence += 0.1;
    if (marketData.trend === 'bearish') confidence += 0.1;
    
    return Math.min(confidence, 1.0);
  }

  private shouldExecuteStrategy(strategy: DCAStrategy, marketData: MarketCondition): boolean {
    // Check if strategy is active
    if (!strategy.isActive) return false;
    
    // Check time-based execution
    if (strategy.nextExecution && strategy.nextExecution > new Date()) return false;
    
    // Check market conditions
    if (strategy.parameters.volatilityThreshold && 
        marketData.volatility < strategy.parameters.volatilityThreshold) {
      return false;
    }
    
    return true;
  }

  private async getTokenForStrategy(strategy: DCAStrategy, portfolio: Portfolio): Promise<TokenInfo | null> {
    // Simplified token selection - in production, this would be more sophisticated
    return portfolio.positions[0]?.token || null;
  }

  private calculateExecutionAmount(strategy: DCAStrategy, portfolio: Portfolio, token: TokenInfo): string {
    const baseAmount = parseFloat(strategy.parameters.amountPerExecution);
    
    // Adjust based on portfolio size and market conditions
    const portfolioValue = portfolio.metrics.totalValue;
    const maxAmount = portfolioValue * 0.05; // Max 5% of portfolio per execution
    
    return Math.min(baseAmount, maxAmount).toString();
  }

  private generateExecutionReason(strategy: DCAStrategy, marketData: MarketCondition): string {
    const reasons: string[] = [];
    
    if (strategy.type === 'time_based') {
      reasons.push('Scheduled time-based execution');
    }
    
    if (strategy.type === 'volatility_based' && marketData.volatility > 0.3) {
      reasons.push('High volatility triggered execution');
    }
    
    if (strategy.type === 'price_based') {
      reasons.push('Price threshold triggered execution');
    }
    
    return reasons.join(' - ');
  }

  private calculateCurrentValue(executions: DCAExecution[]): number {
    // Simplified current value calculation
    return executions.reduce((sum, e) => {
      const amount = parseFloat(e.amount);
      const currentPrice = e.token.price;
      return sum + (amount * currentPrice);
    }, 0);
  }

  private generatePerformanceRecommendations(
    strategy: DCAStrategy,
    returnPercentage: number,
    successRate: number,
    executionCount: number
  ): string[] {
    const recommendations: string[] = [];
    
    if (returnPercentage < -10) {
      recommendations.push('Consider pausing strategy due to poor performance');
    }
    
    if (successRate < 70) {
      recommendations.push('Review execution parameters to improve success rate');
    }
    
    if (executionCount < 3) {
      recommendations.push('Strategy needs more executions for meaningful analysis');
    }
    
    if (returnPercentage > 20) {
      recommendations.push('Consider taking partial profits');
    }
    
    return recommendations;
  }

  private validateStrategyParameters(strategy: DCAStrategy): void {
    if (parseFloat(strategy.parameters.amountPerExecution) <= 0) {
      throw new Error('Amount per execution must be positive');
    }
    
    if (strategy.parameters.minExecutionInterval && strategy.parameters.minExecutionInterval < 1) {
      throw new Error('Minimum execution interval must be at least 1 hour');
    }
  }

  private calculateNextExecution(parameters: DCAParameters, strategyType: DCAStrategy['type']): Date {
    const now = new Date();
    
    if (strategyType === 'time_based' && parameters.frequency) {
      const intervals = {
        'hourly': 1,
        'daily': 24,
        'weekly': 168,
        'monthly': 720
      };
      
      const hours = intervals[parameters.frequency] || 24;
      return new Date(now.getTime() + hours * 60 * 60 * 1000);
    }
    
    // Default to 24 hours
    return new Date(now.getTime() + 24 * 60 * 60 * 1000);
  }

  private getRecommendedTokenForBearMarket(): TokenInfo {
    // Simplified token recommendation
    return {
      address: '0x0000000000000000000000000000000000000000',
      symbol: 'ETH',
      name: 'Ethereum',
      decimals: 18,
      price: 2000
    };
  }

  private createBearMarketStrategy(): Partial<DCAStrategy> {
    return {
      name: 'Bear Market DCA',
      type: 'volatility_based',
      parameters: {
        amountPerExecution: '100',
        frequency: 'daily',
        volatilityThreshold: 0.25,
        maxTotalAmount: '10000',
        minExecutionInterval: 12
      }
    };
  }

  private generateStrategyId(): string {
    return `dca_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateExecutionId(): string {
    return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateRecommendationId(): string {
    return `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
