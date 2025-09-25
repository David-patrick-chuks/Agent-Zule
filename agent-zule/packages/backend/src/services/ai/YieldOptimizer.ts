import { Logger } from '../../utils/Logger';
import { Portfolio, Position, YieldAnalysis, YieldSource, YieldOpportunity } from '../../types/Portfolio';
import { TokenInfo, RiskLevel } from '../../types/Common';

export interface YieldOptimizationOptions {
  minApyThreshold?: number;
  maxRiskLevel?: RiskLevel;
  includeLiquidityPools?: boolean;
  includeStaking?: boolean;
  includeLending?: boolean;
  maxSlippage?: number;
  gasCostThreshold?: number;
}

export interface YieldOptimizationResult {
  portfolioId: string;
  currentYield: number;
  optimizedYield: number;
  improvement: number;
  opportunities: YieldOpportunity[];
  migrations: YieldMigration[];
  estimatedGasCost: number;
  confidence: number;
  timestamp: Date;
}

export interface YieldMigration {
  from: {
    token: TokenInfo;
    source: string;
    apy: number;
  };
  to: {
    token: TokenInfo;
    source: string;
    apy: number;
  };
  amount: string;
  expectedImprovement: number;
  riskLevel: RiskLevel;
  gasCost: number;
  slippage: number;
  priority: 'low' | 'medium' | 'high';
}

export class YieldOptimizer {
  private static instance: YieldOptimizer;
  private logger = Logger.getInstance();

  // Yield sources data (in production, this would come from external APIs)
  private yieldSources: YieldSource[] = [];

  private constructor() {
    this.initializeYieldSources();
  }

  public static getInstance(): YieldOptimizer {
    if (!YieldOptimizer.instance) {
      YieldOptimizer.instance = new YieldOptimizer();
    }
    return YieldOptimizer.instance;
  }

  /**
   * Optimize portfolio yield by finding better opportunities
   */
  public async optimizeYield(
    portfolio: Portfolio,
    options: YieldOptimizationOptions = {}
  ): Promise<YieldOptimizationResult> {
    const startTime = Date.now();

    try {
      this.logger.logAI('YieldOptimizer', 'optimization_started', {
        portfolioId: portfolio.id,
        userId: portfolio.userId,
        options
      });

      const {
        minApyThreshold = 0.05, // 5% minimum
        maxRiskLevel = 'medium',
        includeLiquidityPools = true,
        includeStaking = true,
        includeLending = true,
        maxSlippage = 0.01, // 1%
        gasCostThreshold = 0.001 // 0.1% of portfolio value
      } = options;

      // Analyze current yield
      const currentYield = await this.analyzeCurrentYield(portfolio);
      
      // Find yield opportunities
      const opportunities = await this.findYieldOpportunities(
        portfolio,
        minApyThreshold,
        maxRiskLevel,
        { includeLiquidityPools, includeStaking, includeLending }
      );

      // Generate migration recommendations
      const migrations = await this.generateMigrationRecommendations(
        portfolio,
        opportunities,
        maxSlippage,
        gasCostThreshold
      );

      // Calculate optimized yield
      const optimizedYield = this.calculateOptimizedYield(currentYield, migrations);
      const improvement = optimizedYield - currentYield;

      // Calculate estimated gas cost
      const estimatedGasCost = this.calculateTotalGasCost(migrations);

      const confidence = this.calculateConfidence(opportunities, migrations);
      const duration = Date.now() - startTime;

      this.logger.logPerformance('yield_optimization', duration, {
        portfolioId: portfolio.id,
        currentYield,
        optimizedYield,
        improvement,
        opportunitiesCount: opportunities.length,
        migrationsCount: migrations.length
      });

      return {
        portfolioId: portfolio.id,
        currentYield,
        optimizedYield,
        improvement,
        opportunities,
        migrations,
        estimatedGasCost,
        confidence,
        timestamp: new Date()
      };

    } catch (error) {
      this.logger.error('Yield optimization failed', error, {
        portfolioId: portfolio.id,
        userId: portfolio.userId
      });
      throw error;
    }
  }

  /**
   * Analyze current portfolio yield
   */
  private async analyzeCurrentYield(portfolio: Portfolio): Promise<number> {
    try {
      let totalYield = 0;
      let totalValue = 0;

      for (const position of portfolio.positions) {
        // Find yield source for this token
        const yieldSource = this.findYieldSource(position.token.address);
        const positionValue = position.value;
        
        if (yieldSource) {
          totalYield += positionValue * yieldSource.apy;
        }
        
        totalValue += positionValue;
      }

      return totalValue > 0 ? totalYield / totalValue : 0;

    } catch (error) {
      this.logger.error('Failed to analyze current yield', error);
      return 0;
    }
  }

  /**
   * Find yield optimization opportunities
   */
  private async findYieldOpportunities(
    portfolio: Portfolio,
    minApyThreshold: number,
    maxRiskLevel: RiskLevel,
    sources: {
      includeLiquidityPools: boolean;
      includeStaking: boolean;
      includeLending: boolean;
    }
  ): Promise<YieldOpportunity[]> {
    try {
      const opportunities: YieldOpportunity[] = [];

      for (const position of portfolio.positions) {
        const currentYieldSource = this.findYieldSource(position.token.address);
        const currentApy = currentYieldSource?.apy || 0;

        // Find better yield sources for this token
        const betterSources = this.yieldSources.filter(source => {
          // Must be for the same token or compatible token
          if (source.token !== position.token.address) {
            return this.isTokenCompatible(position.token.address, source.token);
          }

          // Must have better APY
          if (source.apy <= currentApy) return false;

          // Must meet minimum threshold
          if (source.apy < minApyThreshold) return false;

          // Must meet risk requirements
          if (this.isRiskLevelTooHigh(source.risk, maxRiskLevel)) return false;

          // Must match source preferences
          if (source.source === 'liquidity_pool' && !sources.includeLiquidityPools) return false;
          if (source.source === 'staking' && !sources.includeStaking) return false;
          if (source.source === 'lending' && !sources.includeLending) return false;

          return true;
        });

        // Create opportunities
        for (const source of betterSources) {
          const potentialApy = source.apy;
          const improvement = potentialApy - currentApy;
          
          if (improvement > 0.001) { // At least 0.1% improvement
            opportunities.push({
              from: position.token,
              to: await this.getTokenInfo(source.token),
              potentialApy,
              riskLevel: source.risk,
              migrationCost: this.estimateMigrationCost(position.token.address, source.token),
              description: `Migrate from ${this.getSourceDescription(currentYieldSource)} to ${this.getSourceDescription(source)}`
            });
          }
        }
      }

      // Sort by potential improvement
      return opportunities.sort((a, b) => b.potentialApy - a.potentialApy);

    } catch (error) {
      this.logger.error('Failed to find yield opportunities', error);
      return [];
    }
  }

  /**
   * Generate migration recommendations
   */
  private async generateMigrationRecommendations(
    portfolio: Portfolio,
    opportunities: YieldOpportunity[],
    maxSlippage: number,
    gasCostThreshold: number
  ): Promise<YieldMigration[]> {
    try {
      const migrations: YieldMigration[] = [];

      for (const opportunity of opportunities) {
        const position = portfolio.positions.find(p => p.token.address === opportunity.from.address);
        if (!position) continue;

        // Calculate migration amount (start with small percentage)
        const migrationPercentage = this.calculateMigrationPercentage(opportunity, position);
        const migrationAmount = (position.value * migrationPercentage).toString();

        // Estimate costs
        const gasCost = this.estimateGasCost(opportunity.from.address, opportunity.to.address);
        const slippage = this.estimateSlippage(opportunity.to.address, parseFloat(migrationAmount));

        // Skip if costs are too high
        if (slippage > maxSlippage) continue;
        if (gasCost / portfolio.metrics.totalValue > gasCostThreshold) continue;

        const expectedImprovement = (opportunity.potentialApy - this.getCurrentYield(position.token.address)) * migrationPercentage;
        const priority = this.calculatePriority(opportunity, expectedImprovement, gasCost);

        migrations.push({
          from: {
            token: opportunity.from,
            source: this.getCurrentSource(position.token.address),
            apy: this.getCurrentYield(position.token.address)
          },
          to: {
            token: opportunity.to,
            source: this.getTargetSource(opportunity.to.address),
            apy: opportunity.potentialApy
          },
          amount: migrationAmount,
          expectedImprovement,
          riskLevel: opportunity.riskLevel,
          gasCost,
          slippage,
          priority
        });
      }

      // Sort by priority and expected improvement
      return migrations.sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
          return priorityOrder[b.priority] - priorityOrder[a.priority];
        }
        return b.expectedImprovement - a.expectedImprovement;
      });

    } catch (error) {
      this.logger.error('Failed to generate migration recommendations', error);
      return [];
    }
  }

  /**
   * Calculate optimized yield after migrations
   */
  private calculateOptimizedYield(currentYield: number, migrations: YieldMigration[]): number {
    let totalImprovement = 0;
    
    migrations.forEach(migration => {
      totalImprovement += migration.expectedImprovement;
    });

    return currentYield + totalImprovement;
  }

  /**
   * Calculate total gas cost for all migrations
   */
  private calculateTotalGasCost(migrations: YieldMigration[]): number {
    return migrations.reduce((total, migration) => total + migration.gasCost, 0);
  }

  /**
   * Calculate confidence in optimization recommendations
   */
  private calculateConfidence(opportunities: YieldOpportunity[], migrations: YieldMigration[]): number {
    let confidence = 0.7; // Base confidence

    // Increase confidence with more opportunities
    if (opportunities.length > 3) confidence += 0.1;
    if (opportunities.length > 5) confidence += 0.1;

    // Increase confidence with high-quality migrations
    const highQualityMigrations = migrations.filter(m => m.priority === 'high').length;
    if (highQualityMigrations > 0) confidence += 0.1;

    // Decrease confidence if many high-risk opportunities
    const highRiskOpportunities = opportunities.filter(o => o.riskLevel === 'high').length;
    if (highRiskOpportunities > opportunities.length * 0.5) confidence -= 0.1;

    return Math.max(0.5, Math.min(1.0, confidence));
  }

  // Helper methods
  private initializeYieldSources(): void {
    // In production, this would be populated from external APIs
    this.yieldSources = [
      // Ethereum-based yields
      {
        token: '0xA0b86a33E6Ba3C2a1F2C8d7e2F4E3B2A1C0D9E8F',
        source: 'staking',
        apy: 0.045, // 4.5%
        risk: 'low'
      },
      {
        token: '0xB1c97a33E6Ba3C2a1F2C8d7e2F4E3B2A1C0D9E8F',
        source: 'liquidity_pool',
        apy: 0.12, // 12%
        risk: 'medium'
      },
      {
        token: '0xC2d98a33E6Ba3C2a1F2C8d7e2F4E3B2A1C0D9E8F',
        source: 'lending',
        apy: 0.08, // 8%
        risk: 'low'
      },
      // Add more yield sources as needed
    ];
  }

  private findYieldSource(tokenAddress: string): YieldSource | null {
    return this.yieldSources.find(source => source.token === tokenAddress) || null;
  }

  private isTokenCompatible(fromToken: string, toToken: string): boolean {
    // Simplified compatibility check
    // In production, this would check token compatibility and bridge availability
    return fromToken !== toToken;
  }

  private isRiskLevelTooHigh(risk: string, maxRisk: RiskLevel): boolean {
    const riskLevels = { low: 1, medium: 2, high: 3, critical: 4 };
    return riskLevels[risk as RiskLevel] > riskLevels[maxRisk];
  }

  private async getTokenInfo(tokenAddress: string): Promise<TokenInfo> {
    // In production, this would fetch from token registry or API
    return {
      address: tokenAddress,
      symbol: 'UNKNOWN',
      name: 'Unknown Token',
      decimals: 18,
      price: 0
    };
  }

  private estimateMigrationCost(fromToken: string, toToken: string): number {
    // Simplified migration cost estimation
    return 0.001; // 0.1% placeholder
  }

  private getSourceDescription(source: YieldSource | null): string {
    if (!source) return 'no yield';
    
    const sourceNames = {
      'staking': 'staking',
      'liquidity_pool': 'liquidity pool',
      'lending': 'lending',
      'farming': 'yield farming'
    };
    
    return `${sourceNames[source.source] || source.source} (${(source.apy * 100).toFixed(1)}% APY)`;
  }

  private calculateMigrationPercentage(opportunity: YieldOpportunity, position: Position): number {
    // Start with conservative migration percentage
    let percentage = 0.1; // 10%

    // Increase percentage based on opportunity quality
    if (opportunity.riskLevel === 'low') percentage += 0.1;
    if (opportunity.potentialApy > 0.15) percentage += 0.1; // High yield opportunity

    // Cap at 50% of position
    return Math.min(percentage, 0.5);
  }

  private estimateGasCost(fromToken: string, toToken: string): number {
    // Simplified gas cost estimation
    return 0.005; // 0.005 ETH placeholder
  }

  private estimateSlippage(tokenAddress: string, amount: number): number {
    // Simplified slippage estimation based on token liquidity
    return 0.005; // 0.5% placeholder
  }

  private getCurrentYield(tokenAddress: string): number {
    const source = this.findYieldSource(tokenAddress);
    return source?.apy || 0;
  }

  private getCurrentSource(tokenAddress: string): string {
    const source = this.findYieldSource(tokenAddress);
    return source?.source || 'no yield';
  }

  private getTargetSource(tokenAddress: string): string {
    const source = this.yieldSources.find(s => s.token === tokenAddress);
    return source?.source || 'unknown';
  }

  private calculatePriority(
    opportunity: YieldOpportunity,
    expectedImprovement: number,
    gasCost: number
  ): 'low' | 'medium' | 'high' {
    const improvementRatio = expectedImprovement / gasCost;
    
    if (improvementRatio > 100 && opportunity.riskLevel === 'low') return 'high';
    if (improvementRatio > 50) return 'medium';
    return 'low';
  }
}
