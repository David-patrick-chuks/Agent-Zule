import { MarketCondition, RiskLevel } from '../../types/Common';
import { Portfolio, RiskAssessment, RiskFactor } from '../../types/Portfolio';
import { Logger } from '../../utils/Logger';

export interface RiskMetrics {
  portfolioRisk: number;
  concentrationRisk: number;
  correlationRisk: number;
  liquidityRisk: number;
  marketRisk: number;
  volatilityRisk: number;
  creditRisk: number;
  operationalRisk: number;
  overallRisk: number;
}

export interface RiskThreshold {
  level: RiskLevel;
  minValue: number;
  maxValue: number;
  description: string;
}

export interface RiskAlert {
  id: string;
  type: 'warning' | 'critical' | 'info';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  affectedAssets: string[];
  recommendations: string[];
  timestamp: Date;
  acknowledged: boolean;
}

export interface RiskMitigation {
  id: string;
  riskFactor: string;
  action: 'reduce_position' | 'add_hedge' | 'diversify' | 'increase_liquidity' | 'stop_trading';
  description: string;
  expectedImpact: number;
  implementationCost: number;
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

export interface RiskScenario {
  name: string;
  probability: number; // 0-1
  impact: number; // 0-1
  description: string;
  affectedPositions: string[];
  estimatedLoss: number;
  mitigation: string[];
}

export class RiskAssessor {
  private static instance: RiskAssessor;
  private logger = Logger.getInstance();

  private riskThresholds: RiskThreshold[] = [
    {
      level: 'low',
      minValue: 0,
      maxValue: 25,
      description: 'Low risk - conservative portfolio'
    },
    {
      level: 'medium',
      minValue: 25,
      maxValue: 50,
      description: 'Medium risk - balanced portfolio'
    },
    {
      level: 'high',
      minValue: 50,
      maxValue: 75,
      description: 'High risk - aggressive portfolio'
    },
    {
      level: 'critical',
      minValue: 75,
      maxValue: 100,
      description: 'Critical risk - requires immediate attention'
    }
  ];

  private constructor() {}

  public static getInstance(): RiskAssessor {
    if (!RiskAssessor.instance) {
      RiskAssessor.instance = new RiskAssessor();
    }
    return RiskAssessor.instance;
  }

  /**
   * Comprehensive risk assessment of portfolio
   */
  public async assessPortfolioRisk(
    portfolio: Portfolio,
    marketData: MarketCondition
  ): Promise<RiskAssessment> {
    try {
      this.logger.logAI('RiskAssessor', 'assessment_started', {
        portfolioId: portfolio.id,
        userId: portfolio.userId,
        marketCondition: marketData.trend
      });

      const riskMetrics = await this.calculateRiskMetrics(portfolio, marketData);
      const riskFactors = await this.identifyRiskFactors(portfolio, marketData, riskMetrics);
      const recommendations = this.generateRiskRecommendations(riskFactors, riskMetrics);

      const riskLevel = this.determineRiskLevel(riskMetrics.overallRisk);
      const riskScore = Math.round(riskMetrics.overallRisk);

      return {
        score: riskScore,
        level: riskLevel,
        factors: riskFactors,
        recommendations
      };

    } catch (error) {
      this.logger.error('Risk assessment failed', error, {
        portfolioId: portfolio.id
      });
      throw error;
    }
  }

  /**
   * Generate risk alerts for portfolio
   */
  public async generateRiskAlerts(
    portfolio: Portfolio,
    marketData: MarketCondition,
    riskMetrics: RiskMetrics
  ): Promise<RiskAlert[]> {
    try {
      const alerts: RiskAlert[] = [];

      // Concentration risk alert
      if (riskMetrics.concentrationRisk > 70) {
        alerts.push({
          id: this.generateAlertId(),
          type: 'warning',
          severity: 'high',
          title: 'High Concentration Risk',
          description: `Portfolio is highly concentrated in ${this.getTopPositions(portfolio, 3).join(', ')}`,
          affectedAssets: this.getTopPositions(portfolio, 3),
          recommendations: [
            'Diversify across more assets',
            'Reduce position size in top holdings',
            'Consider adding uncorrelated assets'
          ],
          timestamp: new Date(),
          acknowledged: false
        });
      }

      // Market risk alert
      if (riskMetrics.marketRisk > 80) {
        alerts.push({
          id: this.generateAlertId(),
          type: 'critical',
          severity: 'critical',
          title: 'Extreme Market Risk',
          description: `Market volatility is extremely high (${(marketData.volatility * 100).toFixed(1)}%)`,
          affectedAssets: portfolio.positions.map(p => p.token.symbol),
          recommendations: [
            'Consider reducing position sizes',
            'Add defensive assets',
            'Implement stop-loss orders',
            'Consider hedging strategies'
          ],
          timestamp: new Date(),
          acknowledged: false
        });
      }

      // Liquidity risk alert
      if (riskMetrics.liquidityRisk > 60) {
        alerts.push({
          id: this.generateAlertId(),
          type: 'warning',
          severity: 'medium',
          title: 'Liquidity Risk Detected',
          description: 'Portfolio contains assets with low liquidity',
          affectedAssets: this.getLowLiquidityAssets(portfolio),
          recommendations: [
            'Maintain adequate liquid reserves',
            'Avoid large positions in low-liquidity assets',
            'Consider more liquid alternatives'
          ],
          timestamp: new Date(),
          acknowledged: false
        });
      }

      // Correlation risk alert
      if (riskMetrics.correlationRisk > 75) {
        alerts.push({
          id: this.generateAlertId(),
          type: 'warning',
          severity: 'medium',
          title: 'High Correlation Risk',
          description: 'Portfolio assets are highly correlated',
          affectedAssets: portfolio.positions.map(p => p.token.symbol),
          recommendations: [
            'Diversify across uncorrelated asset classes',
            'Add alternative investments',
            'Consider geographic diversification'
          ],
          timestamp: new Date(),
          acknowledged: false
        });
      }

      return alerts;

    } catch (error) {
      this.logger.error('Failed to generate risk alerts', error);
      return [];
    }
  }

  /**
   * Generate risk mitigation strategies
   */
  public async generateMitigationStrategies(
    portfolio: Portfolio,
    riskFactors: RiskFactor[],
    marketData: MarketCondition
  ): Promise<RiskMitigation[]> {
    try {
      const mitigations: RiskMitigation[] = [];

      for (const factor of riskFactors) {
        if (factor.impact === 'high') {
          const mitigation = this.createMitigationStrategy(factor, portfolio, marketData);
          if (mitigation) {
            mitigations.push(mitigation);
          }
        }
      }

      // Sort by priority
      return mitigations.sort((a, b) => {
        const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      });

    } catch (error) {
      this.logger.error('Failed to generate mitigation strategies', error);
      return [];
    }
  }

  /**
   * Run stress tests on portfolio
   */
  public async runStressTests(portfolio: Portfolio): Promise<RiskScenario[]> {
    try {
      const scenarios: RiskScenario[] = [
        {
          name: 'Market Crash (-50%)',
          probability: 0.05,
          impact: 0.8,
          description: 'Severe market downturn affecting all assets',
          affectedPositions: portfolio.positions.map(p => p.token.symbol),
          estimatedLoss: portfolio.metrics.totalValue * 0.4,
          mitigation: ['Reduce leverage', 'Add hedges', 'Increase cash position']
        },
        {
          name: 'High Volatility Period',
          probability: 0.2,
          impact: 0.4,
          description: 'Extended period of high market volatility',
          affectedPositions: portfolio.positions.map(p => p.token.symbol),
          estimatedLoss: portfolio.metrics.totalValue * 0.15,
          mitigation: ['Reduce position sizes', 'Add volatility hedges']
        },
        {
          name: 'Liquidity Crisis',
          probability: 0.1,
          impact: 0.6,
          description: 'Severe liquidity shortage in markets',
          affectedPositions: this.getLowLiquidityAssets(portfolio),
          estimatedLoss: portfolio.metrics.totalValue * 0.25,
          mitigation: ['Increase liquid reserves', 'Avoid illiquid assets']
        },
        {
          name: 'Correlation Breakdown',
          probability: 0.15,
          impact: 0.3,
          description: 'Previously uncorrelated assets become highly correlated',
          affectedPositions: portfolio.positions.map(p => p.token.symbol),
          estimatedLoss: portfolio.metrics.totalValue * 0.2,
          mitigation: ['True diversification', 'Alternative investments']
        }
      ];

      return scenarios;

    } catch (error) {
      this.logger.error('Failed to run stress tests', error);
      return [];
    }
  }

  /**
   * Calculate risk-adjusted returns
   */
  public calculateRiskAdjustedReturns(
    portfolio: Portfolio,
    riskMetrics: RiskMetrics
  ): {
    sharpeRatio: number;
    sortinoRatio: number;
    calmarRatio: number;
    informationRatio: number;
    treynorRatio: number;
  } {
    try {
      const returns = portfolio.metrics.totalPnlPercentage / 100;
      const riskFreeRate = 0.02; // 2% risk-free rate
      const volatility = riskMetrics.volatilityRisk / 100;
      const beta = this.calculateBeta(portfolio);

      const sharpeRatio = volatility > 0 ? (returns - riskFreeRate) / volatility : 0;
      const sortinoRatio = this.calculateSortinoRatio(returns, volatility);
      const calmarRatio = portfolio.metrics.maxDrawdown > 0 ? returns / (portfolio.metrics.maxDrawdown / 100) : 0;
      const informationRatio = this.calculateInformationRatio(portfolio);
      const treynorRatio = beta > 0 ? (returns - riskFreeRate) / beta : 0;

      return {
        sharpeRatio,
        sortinoRatio,
        calmarRatio,
        informationRatio,
        treynorRatio
      };

    } catch (error) {
      this.logger.error('Failed to calculate risk-adjusted returns', error);
      return {
        sharpeRatio: 0,
        sortinoRatio: 0,
        calmarRatio: 0,
        informationRatio: 0,
        treynorRatio: 0
      };
    }
  }

  // Private helper methods
  private async calculateRiskMetrics(
    portfolio: Portfolio,
    marketData: MarketCondition
  ): Promise<RiskMetrics> {
    const portfolioRisk = this.calculatePortfolioRisk(portfolio);
    const concentrationRisk = this.calculateConcentrationRisk(portfolio);
    const correlationRisk = this.calculateCorrelationRisk(portfolio);
    const liquidityRisk = this.calculateLiquidityRisk(portfolio);
    const marketRisk = this.calculateMarketRisk(marketData);
    const volatilityRisk = this.calculateVolatilityRisk(portfolio, marketData);
    const creditRisk = this.calculateCreditRisk(portfolio);
    const operationalRisk = this.calculateOperationalRisk(portfolio);

    // Calculate overall risk using weighted average
    const weights = {
      portfolioRisk: 0.2,
      concentrationRisk: 0.15,
      correlationRisk: 0.15,
      liquidityRisk: 0.1,
      marketRisk: 0.2,
      volatilityRisk: 0.1,
      creditRisk: 0.05,
      operationalRisk: 0.05
    };

    const overallRisk = 
      portfolioRisk * weights.portfolioRisk +
      concentrationRisk * weights.concentrationRisk +
      correlationRisk * weights.correlationRisk +
      liquidityRisk * weights.liquidityRisk +
      marketRisk * weights.marketRisk +
      volatilityRisk * weights.volatilityRisk +
      creditRisk * weights.creditRisk +
      operationalRisk * weights.operationalRisk;

    return {
      portfolioRisk,
      concentrationRisk,
      correlationRisk,
      liquidityRisk,
      marketRisk,
      volatilityRisk,
      creditRisk,
      operationalRisk,
      overallRisk
    };
  }

  private calculatePortfolioRisk(portfolio: Portfolio): number {
    // Based on portfolio volatility and drawdown
    const volatility = portfolio.metrics.volatility || 0.25;
    const maxDrawdown = portfolio.metrics.maxDrawdown || 0.15;
    
    return Math.min(100, (volatility * 200) + (maxDrawdown * 300));
  }

  private calculateConcentrationRisk(portfolio: Portfolio): number {
    // Herfindahl-Hirschman Index
    const hhi = portfolio.positions.reduce((sum, pos) => sum + Math.pow(pos.allocation, 2), 0);
    return Math.min(100, hhi * 100);
  }

  private calculateCorrelationRisk(portfolio: Portfolio): number {
    // Simplified correlation risk calculation
    const numPositions = portfolio.positions.length;
    if (numPositions < 3) return 80; // High risk with few positions
    
    // Calculate correlation based on position types and token characteristics
    let totalCorrelation = 0;
    let pairCount = 0;
    
    for (let i = 0; i < numPositions; i++) {
      for (let j = i + 1; j < numPositions; j++) {
        const pos1 = portfolio.positions[i];
        const pos2 = portfolio.positions[j];
        
        const correlation = this.calculatePositionCorrelation(pos1, pos2);
        totalCorrelation += correlation;
        pairCount++;
      }
    }
    
    const averageCorrelation = pairCount > 0 ? totalCorrelation / pairCount : 0.6;
    return averageCorrelation * 100;
  }

  private calculateLiquidityRisk(portfolio: Portfolio): number {
    // Simplified liquidity risk calculation
    let liquidityRisk = 0;
    
    for (const position of portfolio.positions) {
      // Estimate liquidity based on token characteristics
      const estimatedLiquidity = this.estimateTokenLiquidity(position.token);
      liquidityRisk += (1 - estimatedLiquidity) * position.allocation * 100;
    }
    
    return Math.min(100, liquidityRisk);
  }

  private calculateMarketRisk(marketData: MarketCondition): number {
    // Market risk based on volatility and trend
    let marketRisk = marketData.volatility * 100;
    
    if (marketData.trend === 'bearish') marketRisk *= 1.3;
    if (marketData.trend === 'sideways') marketRisk *= 1.1;
    
    return Math.min(100, marketRisk);
  }

  private calculateVolatilityRisk(portfolio: Portfolio, marketData: MarketCondition): number {
    const portfolioVolatility = portfolio.metrics.volatility || 0.25;
    const marketVolatility = marketData.volatility;
    
    // Higher risk if portfolio is more volatile than market
    const volatilityRatio = portfolioVolatility / marketVolatility;
    return Math.min(100, volatilityRatio * 50);
  }

  private calculateCreditRisk(portfolio: Portfolio): number {
    // Calculate credit risk based on protocol and smart contract risks
    let totalWeightedRisk = 0;
    let totalWeight = 0;
    
    portfolio.positions.forEach(position => {
      const protocolRisk = this.getProtocolRisk(position.token);
      const smartContractRisk = this.getSmartContractRisk(position.token);
      const creditRisk = Math.max(protocolRisk, smartContractRisk);
      
      const weight = position.allocation;
      totalWeightedRisk += creditRisk * weight;
      totalWeight += weight;
    });
    
    return totalWeight > 0 ? totalWeightedRisk / totalWeight : 20;
  }

  private calculateOperationalRisk(portfolio: Portfolio): number {
    // Operational risk based on portfolio complexity and automation
    let operationalRisk = 10; // Base operational risk
    
    if (portfolio.positions.length > 10) operationalRisk += 10;
    if (portfolio.strategy.yieldOptimizationEnabled) operationalRisk += 5;
    if (portfolio.strategy.dcaEnabled) operationalRisk += 5;
    
    return Math.min(100, operationalRisk);
  }

  private async identifyRiskFactors(
    portfolio: Portfolio,
    marketData: MarketCondition,
    riskMetrics: RiskMetrics
  ): Promise<RiskFactor[]> {
    const factors: RiskFactor[] = [];

    // Concentration risk factor
    if (riskMetrics.concentrationRisk > 50) {
      factors.push({
        name: 'Concentration Risk',
        impact: 'high',
        description: `Portfolio is concentrated in ${this.getTopPositions(portfolio, 3).join(', ')}`,
        mitigation: 'Diversify across more assets and sectors'
      });
    }

    // Market risk factor
    if (riskMetrics.marketRisk > 60) {
      factors.push({
        name: 'Market Risk',
        impact: 'high',
        description: `High market volatility (${(marketData.volatility * 100).toFixed(1)}%)`,
        mitigation: 'Consider hedging strategies or defensive positioning'
      });
    }

    // Liquidity risk factor
    if (riskMetrics.liquidityRisk > 40) {
      factors.push({
        name: 'Liquidity Risk',
        impact: 'medium',
        description: 'Portfolio contains low-liquidity assets',
        mitigation: 'Maintain adequate liquid reserves'
      });
    }

    // Correlation risk factor
    if (riskMetrics.correlationRisk > 60) {
      factors.push({
        name: 'Correlation Risk',
        impact: 'medium',
        description: 'High correlation between portfolio assets',
        mitigation: 'Add uncorrelated assets'
      });
    }

    return factors;
  }

  private generateRiskRecommendations(
    riskFactors: RiskFactor[],
    riskMetrics: RiskMetrics
  ): string[] {
    const recommendations: string[] = [];

    if (riskMetrics.concentrationRisk > 60) {
      recommendations.push('Reduce concentration by diversifying across more assets');
    }

    if (riskMetrics.marketRisk > 70) {
      recommendations.push('Consider defensive positioning during high market volatility');
    }

    if (riskMetrics.liquidityRisk > 50) {
      recommendations.push('Increase liquid reserves and avoid large illiquid positions');
    }

    if (riskMetrics.correlationRisk > 60) {
      recommendations.push('Add uncorrelated assets to improve diversification');
    }

    if (riskMetrics.overallRisk > 75) {
      recommendations.push('Consider reducing overall portfolio risk through position sizing');
    }

    return recommendations;
  }

  private determineRiskLevel(riskScore: number): RiskLevel {
    for (const threshold of this.riskThresholds) {
      if (riskScore >= threshold.minValue && riskScore <= threshold.maxValue) {
        return threshold.level;
      }
    }
    return 'critical';
  }

  private createMitigationStrategy(
    factor: RiskFactor,
    portfolio: Portfolio,
    marketData: MarketCondition
  ): RiskMitigation | null {
    switch (factor.name) {
      case 'Concentration Risk':
        return {
          id: this.generateMitigationId(),
          riskFactor: factor.name,
          action: 'diversify',
          description: 'Add more diversified positions to reduce concentration',
          expectedImpact: 0.3,
          implementationCost: 0.02,
          priority: 'high'
        };

      case 'Market Risk':
        return {
          id: this.generateMitigationId(),
          riskFactor: factor.name,
          action: 'add_hedge',
          description: 'Add hedging positions to protect against market downturns',
          expectedImpact: 0.4,
          implementationCost: 0.05,
          priority: 'urgent'
        };

      case 'Liquidity Risk':
        return {
          id: this.generateMitigationId(),
          riskFactor: factor.name,
          action: 'increase_liquidity',
          description: 'Increase liquid reserves and reduce illiquid positions',
          expectedImpact: 0.2,
          implementationCost: 0.01,
          priority: 'medium'
        };

      default:
        return null;
    }
  }

  private estimateTokenLiquidity(token: any): number {
    // Simplified liquidity estimation
    // In production, this would use actual liquidity data
    const stableTokens = ['USDC', 'USDT', 'DAI'];
    if (stableTokens.includes(token.symbol)) return 0.95;
    if (token.symbol === 'ETH') return 0.9;
    if (token.symbol === 'BTC') return 0.85;
    return 0.7; // Default for other tokens
  }

  private getTopPositions(portfolio: Portfolio, count: number): string[] {
    return portfolio.positions
      .sort((a, b) => b.allocation - a.allocation)
      .slice(0, count)
      .map(pos => pos.token.symbol);
  }

  private getLowLiquidityAssets(portfolio: Portfolio): string[] {
    return portfolio.positions
      .filter(pos => this.estimateTokenLiquidity(pos.token) < 0.8)
      .map(pos => pos.token.symbol);
  }

  private calculateBeta(portfolio: Portfolio): number {
    // Calculate weighted average beta based on positions
    if (portfolio.positions.length === 0) return 1;
    
    let totalWeightedBeta = 0;
    let totalWeight = 0;
    
    portfolio.positions.forEach(position => {
      const tokenBeta = this.getTokenBeta(position.token);
      const weight = position.allocation;
      
      totalWeightedBeta += tokenBeta * weight;
      totalWeight += weight;
    });
    
    return totalWeight > 0 ? totalWeightedBeta / totalWeight : 1;
  }

  private calculateSortinoRatio(returns: number, volatility: number): number {
    const riskFreeRate = 0.02;
    return volatility > 0 ? (returns - riskFreeRate) / volatility : 0;
  }

  private calculateInformationRatio(portfolio: Portfolio): number {
    // Calculate information ratio based on portfolio performance vs benchmark
    const portfolioReturn = portfolio.metrics.totalReturn || 0;
    const benchmarkReturn = 0.08; // 8% benchmark return
    const trackingError = this.calculateTrackingError(portfolio);
    
    return trackingError > 0 ? (portfolioReturn - benchmarkReturn) / trackingError : 0;
  }

  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Helper methods for risk calculations
  private calculatePositionCorrelation(pos1: Position, pos2: Position): number {
    // Calculate correlation based on token characteristics
    const token1 = pos1.token;
    const token2 = pos2.token;
    
    if (token1.symbol === token2.symbol) return 1; // Perfect correlation for same token
    
    const token1Type = this.getTokenType(token1.symbol);
    const token2Type = this.getTokenType(token2.symbol);
    
    if (token1Type === token2Type) {
      return 0.7; // High correlation for same type
    } else if (this.areTokensRelated(token1.symbol, token2.symbol)) {
      return 0.5; // Medium correlation for related tokens
    } else {
      return 0.3; // Low correlation for unrelated tokens
    }
  }

  private getProtocolRisk(token: string): number {
    // Return protocol risk based on token characteristics
    const tokenType = this.getTokenType(token);
    
    switch (tokenType) {
      case 'major': return 5; // Low risk for major tokens
      case 'stable': return 2; // Very low risk for stablecoins
      case 'mid': return 15; // Medium risk for mid-cap tokens
      case 'small': return 30; // High risk for small-cap tokens
      default: return 20; // Default risk
    }
  }

  private getSmartContractRisk(token: string): number {
    // Return smart contract risk based on token characteristics
    const tokenType = this.getTokenType(token);
    
    switch (tokenType) {
      case 'major': return 3; // Low risk for major tokens
      case 'stable': return 1; // Very low risk for stablecoins
      case 'mid': return 12; // Medium risk for mid-cap tokens
      case 'small': return 25; // High risk for small-cap tokens
      default: return 15; // Default risk
    }
  }

  private getTokenBeta(token: string): number {
    // Return beta coefficient based on token type
    const tokenType = this.getTokenType(token);
    
    switch (tokenType) {
      case 'major': return 1.0; // Market beta for major tokens
      case 'stable': return 0.1; // Low beta for stablecoins
      case 'mid': return 1.2; // Higher beta for mid-cap tokens
      case 'small': return 1.5; // High beta for small-cap tokens
      default: return 1.1; // Slightly above market beta
    }
  }

  private calculateTrackingError(portfolio: Portfolio): number {
    // Calculate tracking error vs benchmark
    const portfolioVolatility = portfolio.metrics.volatility || 0.2;
    const benchmarkVolatility = 0.15; // 15% benchmark volatility
    
    // Simplified tracking error calculation
    return Math.abs(portfolioVolatility - benchmarkVolatility);
  }

  private getTokenType(token: string): string {
    const majorTokens = ['ETH', 'BTC', 'USDC', 'USDT', 'DAI'];
    const stableTokens = ['USDC', 'USDT', 'DAI', 'BUSD'];
    
    if (majorTokens.includes(token.toUpperCase())) {
      return stableTokens.includes(token.toUpperCase()) ? 'stable' : 'major';
    } else if (token.length > 6) {
      return 'small'; // Long token names are usually small cap
    } else {
      return 'mid'; // Default to mid-cap
    }
  }

  private areTokensRelated(token1: string, token2: string): boolean {
    // Check if tokens are related (same ecosystem, etc.)
    const ethereumTokens = ['ETH', 'USDC', 'USDT', 'DAI', 'UNI', 'AAVE', 'COMP'];
    const bitcoinTokens = ['BTC', 'WBTC'];
    
    const token1Ecosystem = this.getTokenEcosystem(token1);
    const token2Ecosystem = this.getTokenEcosystem(token2);
    
    return token1Ecosystem === token2Ecosystem;
  }

  private getTokenEcosystem(token: string): string {
    const ethereumTokens = ['ETH', 'USDC', 'USDT', 'DAI', 'UNI', 'AAVE', 'COMP'];
    const bitcoinTokens = ['BTC', 'WBTC'];
    
    if (ethereumTokens.includes(token.toUpperCase())) return 'ethereum';
    if (bitcoinTokens.includes(token.toUpperCase())) return 'bitcoin';
    return 'other';
  }

  private generateMitigationId(): string {
    return `mit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
