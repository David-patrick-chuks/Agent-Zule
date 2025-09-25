import { Logger } from '../../utils/Logger';
import { Portfolio, Position, PortfolioMetrics, PortfolioAnalysis, RiskAssessment, PerformanceMetrics, DiversificationAnalysis, RebalancingRecommendation } from '../../types/Portfolio';
import { MarketCondition, RiskLevel } from '../../types/Common';

export interface AnalysisOptions {
  includeRiskAssessment?: boolean;
  includePerformanceMetrics?: boolean;
  includeDiversificationAnalysis?: boolean;
  includeRebalancingRecommendations?: boolean;
  marketData?: MarketCondition;
}

export interface AnalysisResult {
  portfolioId: string;
  analysis: PortfolioAnalysis['analysis'];
  timestamp: Date;
  confidence: number;
}

export class PortfolioAnalyzer {
  private static instance: PortfolioAnalyzer;
  private logger = Logger.getInstance();

  private constructor() {}

  public static getInstance(): PortfolioAnalyzer {
    if (!PortfolioAnalyzer.instance) {
      PortfolioAnalyzer.instance = new PortfolioAnalyzer();
    }
    return PortfolioAnalyzer.instance;
  }

  /**
   * Perform comprehensive portfolio analysis
   */
  public async analyzePortfolio(
    portfolio: Portfolio,
    options: AnalysisOptions = {}
  ): Promise<AnalysisResult> {
    const startTime = Date.now();
    
    try {
      this.logger.logAI('PortfolioAnalyzer', 'analysis_started', {
        portfolioId: portfolio.id,
        userId: portfolio.userId,
        options
      });

      const {
        includeRiskAssessment = true,
        includePerformanceMetrics = true,
        includeDiversificationAnalysis = true,
        includeRebalancingRecommendations = true,
        marketData
      } = options;

      // Calculate overall score
      const overallScore = await this.calculateOverallScore(portfolio, marketData);

      // Risk Assessment
      const riskAssessment = includeRiskAssessment 
        ? await this.assessRisk(portfolio, marketData)
        : null;

      // Performance Metrics
      const performanceMetrics = includePerformanceMetrics
        ? await this.calculatePerformanceMetrics(portfolio)
        : null;

      // Diversification Analysis
      const diversificationAnalysis = includeDiversificationAnalysis
        ? await this.analyzeDiversification(portfolio)
        : null;

      // Rebalancing Recommendations
      const rebalancingRecommendations = includeRebalancingRecommendations
        ? await this.generateRebalancingRecommendations(portfolio, marketData)
        : [];

      const analysis: PortfolioAnalysis['analysis'] = {
        overallScore,
        riskAssessment,
        performanceMetrics,
        diversificationAnalysis,
        rebalancingRecommendations
      };

      const confidence = this.calculateConfidence(portfolio, analysis);
      const duration = Date.now() - startTime;

      this.logger.logPerformance('portfolio_analysis', duration, {
        portfolioId: portfolio.id,
        overallScore,
        confidence
      });

      return {
        portfolioId: portfolio.id,
        analysis,
        timestamp: new Date(),
        confidence
      };

    } catch (error) {
      this.logger.error('Portfolio analysis failed', error, {
        portfolioId: portfolio.id,
        userId: portfolio.userId
      });
      throw error;
    }
  }

  /**
   * Calculate overall portfolio score (0-100)
   */
  private async calculateOverallScore(
    portfolio: Portfolio,
    marketData?: MarketCondition
  ): Promise<number> {
    try {
      let score = 0;
      let weightSum = 0;

      // Risk Score (30% weight) - Lower is better
      const riskScore = this.calculateRiskScore(portfolio);
      score += (100 - riskScore) * 0.3;
      weightSum += 0.3;

      // Diversification Score (25% weight)
      const diversificationScore = this.calculateDiversificationScore(portfolio);
      score += diversificationScore * 0.25;
      weightSum += 0.25;

      // Performance Score (25% weight)
      const performanceScore = this.calculatePerformanceScore(portfolio);
      score += performanceScore * 0.25;
      weightSum += 0.25;

      // Market Alignment Score (20% weight)
      const marketAlignmentScore = marketData 
        ? this.calculateMarketAlignmentScore(portfolio, marketData)
        : 75; // Default neutral score
      score += marketAlignmentScore * 0.2;
      weightSum += 0.2;

      return Math.round(score / weightSum);

    } catch (error) {
      this.logger.error('Failed to calculate overall score', error);
      return 50; // Default neutral score
    }
  }

  /**
   * Assess portfolio risk
   */
  private async assessRisk(
    portfolio: Portfolio,
    marketData?: MarketCondition
  ): Promise<RiskAssessment> {
    try {
      const riskFactors: RiskAssessment['factors'] = [];
      let riskScore = 0;

      // Concentration Risk
      const concentrationRisk = this.calculateConcentrationRisk(portfolio);
      if (concentrationRisk > 0.7) {
        riskFactors.push({
          name: 'High Concentration Risk',
          impact: 'high',
          description: `Portfolio is highly concentrated in ${this.getTopPositions(portfolio, 3).join(', ')}`,
          mitigation: 'Consider diversifying across more assets'
        });
        riskScore += 30;
      }

      // Volatility Risk
      const volatilityRisk = this.calculateVolatilityRisk(portfolio, marketData);
      if (volatilityRisk > 0.5) {
        riskFactors.push({
          name: 'High Volatility Risk',
          impact: 'high',
          description: `Portfolio volatility is ${(volatilityRisk * 100).toFixed(1)}%`,
          mitigation: 'Consider adding stable assets or hedging positions'
        });
        riskScore += 25;
      }

      // Correlation Risk
      const correlationRisk = this.calculateCorrelationRisk(portfolio);
      if (correlationRisk > 0.8) {
        riskFactors.push({
          name: 'High Correlation Risk',
          impact: 'medium',
          description: 'Portfolio assets are highly correlated',
          mitigation: 'Diversify across uncorrelated asset classes'
        });
        riskScore += 20;
      }

      // Liquidity Risk
      const liquidityRisk = this.calculateLiquidityRisk(portfolio);
      if (liquidityRisk > 0.3) {
        riskFactors.push({
          name: 'Liquidity Risk',
          impact: 'medium',
          description: 'Portfolio contains low-liquidity assets',
          mitigation: 'Maintain adequate liquid reserves'
        });
        riskScore += 15;
      }

      // Market Risk
      if (marketData && marketData.volatility > 0.4) {
        riskFactors.push({
          name: 'Market Volatility Risk',
          impact: 'high',
          description: `Market volatility is ${(marketData.volatility * 100).toFixed(1)}%`,
          mitigation: 'Consider reducing position sizes or hedging'
        });
        riskScore += 20;
      }

      // Cap risk score at 100
      riskScore = Math.min(riskScore, 100);

      const riskLevel: RiskLevel = riskScore > 75 ? 'critical' : 
                                   riskScore > 50 ? 'high' : 
                                   riskScore > 25 ? 'medium' : 'low';

      const recommendations = this.generateRiskRecommendations(riskFactors);

      return {
        score: riskScore,
        level: riskLevel,
        factors: riskFactors,
        recommendations
      };

    } catch (error) {
      this.logger.error('Failed to assess risk', error);
      return {
        score: 50,
        level: 'medium',
        factors: [],
        recommendations: ['Unable to assess risk - please review manually']
      };
    }
  }

  /**
   * Calculate performance metrics
   */
  private async calculatePerformanceMetrics(portfolio: Portfolio): Promise<PerformanceMetrics> {
    try {
      // Basic metrics from portfolio data
      const totalReturn = portfolio.metrics.totalPnlPercentage;
      const totalValue = portfolio.metrics.totalValue;

      // Calculate annualized return (simplified)
      const daysSinceCreation = Math.max(1, Math.floor((Date.now() - portfolio.createdAt.getTime()) / (1000 * 60 * 60 * 24)));
      const annualizedReturn = Math.pow(1 + (totalReturn / 100), 365 / daysSinceCreation) - 1;

      // Calculate Sharpe ratio (simplified)
      const riskFreeRate = 0.02; // 2% assumed risk-free rate
      const volatility = portfolio.metrics.volatility || 0.2;
      const sharpeRatio = volatility > 0 ? (annualizedReturn - riskFreeRate) / volatility : 0;

      // Calculate other metrics
      const maxDrawdown = portfolio.metrics.maxDrawdown || this.estimateMaxDrawdown(portfolio);
      const volatility_metric = portfolio.metrics.volatility || this.estimateVolatility(portfolio);
      const beta = this.calculateBeta(portfolio);
      const alpha = annualizedReturn - (riskFreeRate + beta * (annualizedReturn - riskFreeRate));

      return {
        totalReturn,
        annualizedReturn,
        sharpeRatio,
        maxDrawdown,
        volatility: volatility_metric,
        beta,
        alpha,
        sortinoRatio: this.calculateSortinoRatio(annualizedReturn, volatility_metric),
        calmarRatio: maxDrawdown > 0 ? annualizedReturn / maxDrawdown : 0
      };

    } catch (error) {
      this.logger.error('Failed to calculate performance metrics', error);
      return {
        totalReturn: 0,
        annualizedReturn: 0,
        sharpeRatio: 0,
        maxDrawdown: 0,
        volatility: 0,
        beta: 1,
        alpha: 0
      };
    }
  }

  /**
   * Analyze portfolio diversification
   */
  private async analyzeDiversification(portfolio: Portfolio): Promise<DiversificationAnalysis> {
    try {
      const positions = portfolio.positions;
      const numPositions = positions.length;

      // Calculate concentration risk (Herfindahl-Hirschman Index)
      const concentrationRisk = positions.reduce((sum, pos) => sum + Math.pow(pos.allocation, 2), 0);

      // Calculate sector distribution (simplified)
      const sectorDistribution = this.calculateSectorDistribution(positions);

      // Calculate token distribution
      const tokenDistribution = positions.reduce((acc, pos) => {
        acc[pos.token.symbol] = pos.allocation;
        return acc;
      }, {} as Record<string, number>);

      // Calculate correlation matrix (simplified)
      const correlationMatrix = this.calculateCorrelationMatrix(positions);

      // Diversification score
      const score = Math.max(0, 100 - (concentrationRisk * 100));

      // Generate recommendations
      const recommendations = this.generateDiversificationRecommendations(
        concentrationRisk,
        numPositions,
        sectorDistribution
      );

      return {
        score,
        concentrationRisk,
        sectorDistribution,
        tokenDistribution,
        correlationMatrix,
        recommendations
      };

    } catch (error) {
      this.logger.error('Failed to analyze diversification', error);
      return {
        score: 0,
        concentrationRisk: 1,
        sectorDistribution: {},
        tokenDistribution: {},
        correlationMatrix: {},
        recommendations: ['Unable to analyze diversification']
      };
    }
  }

  /**
   * Generate rebalancing recommendations
   */
  private async generateRebalancingRecommendations(
    portfolio: Portfolio,
    marketData?: MarketCondition
  ): Promise<RebalancingRecommendation[]> {
    try {
      const recommendations: RebalancingRecommendation[] = [];
      const targetAllocations = this.calculateTargetAllocations(portfolio);

      for (const position of portfolio.positions) {
        const targetAllocation = targetAllocations[position.token.address] || 0;
        const currentAllocation = position.allocation;
        const difference = Math.abs(currentAllocation - targetAllocation);

        // Only recommend if difference is significant (>5%)
        if (difference > 0.05) {
          const action = currentAllocation > targetAllocation ? 'sell' : 'buy';
          const amount = Math.abs(currentAllocation - targetAllocation) * portfolio.metrics.totalValue;
          const percentage = difference;

          recommendations.push({
            id: `rebalance_${position.token.address}`,
            type: action,
            token: position.token,
            amount: amount.toString(),
            percentage,
            reason: `Rebalance to target allocation of ${(targetAllocation * 100).toFixed(1)}%`,
            priority: difference > 0.1 ? 'high' : difference > 0.07 ? 'medium' : 'low',
            expectedImpact: this.calculateExpectedImpact(position, targetAllocation, marketData),
            riskLevel: this.calculateRecommendationRisk(position, action, marketData)
          });
        }
      }

      // Sort by priority and impact
      return recommendations.sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
          return priorityOrder[b.priority] - priorityOrder[a.priority];
        }
        return b.expectedImpact - a.expectedImpact;
      });

    } catch (error) {
      this.logger.error('Failed to generate rebalancing recommendations', error);
      return [];
    }
  }

  // Helper methods
  private calculateRiskScore(portfolio: Portfolio): number {
    return portfolio.metrics.riskScore || 50;
  }

  private calculateDiversificationScore(portfolio: Portfolio): number {
    const numPositions = portfolio.positions.length;
    const concentrationRisk = portfolio.positions.reduce((sum, pos) => sum + Math.pow(pos.allocation, 2), 0);
    return Math.max(0, 100 - (concentrationRisk * 100));
  }

  private calculatePerformanceScore(portfolio: Portfolio): number {
    const returnScore = Math.max(0, Math.min(100, (portfolio.metrics.totalPnlPercentage + 50) * 2));
    const sharpeScore = portfolio.metrics.sharpeRatio 
      ? Math.max(0, Math.min(100, (portfolio.metrics.sharpeRatio + 2) * 25))
      : 50;
    return (returnScore + sharpeScore) / 2;
  }

  private calculateMarketAlignmentScore(portfolio: Portfolio, marketData: MarketCondition): number {
    // Simplified market alignment calculation
    if (marketData.trend === 'bullish') {
      return 85; // Bullish market favors growth portfolios
    } else if (marketData.trend === 'bearish') {
      return 60; // Bearish market requires defensive positioning
    }
    return 75; // Neutral market
  }

  private calculateConfidence(portfolio: Portfolio, analysis: any): number {
    // Calculate confidence based on data quality and completeness
    let confidence = 0.8; // Base confidence

    // Adjust based on portfolio complexity
    if (portfolio.positions.length < 3) confidence -= 0.1;
    if (portfolio.positions.length > 10) confidence -= 0.05;

    // Adjust based on data completeness
    if (!portfolio.metrics.volatility) confidence -= 0.1;
    if (!portfolio.metrics.sharpeRatio) confidence -= 0.05;

    return Math.max(0.5, Math.min(1.0, confidence));
  }

  private getTopPositions(portfolio: Portfolio, count: number): string[] {
    return portfolio.positions
      .sort((a, b) => b.allocation - a.allocation)
      .slice(0, count)
      .map(pos => pos.token.symbol);
  }

  private calculateConcentrationRisk(portfolio: Portfolio): number {
    return portfolio.positions.reduce((sum, pos) => sum + Math.pow(pos.allocation, 2), 0);
  }

  private calculateVolatilityRisk(portfolio: Portfolio, marketData?: MarketCondition): number {
    const portfolioVolatility = portfolio.metrics.volatility || 0.2;
    const marketVolatility = marketData?.volatility || 0.2;
    return Math.max(portfolioVolatility, marketVolatility);
  }

  private calculateCorrelationRisk(portfolio: Portfolio): number {
    // Simplified correlation calculation
    return 0.6; // Placeholder
  }

  private calculateLiquidityRisk(portfolio: Portfolio): number {
    // Simplified liquidity risk calculation
    return 0.2; // Placeholder
  }

  private generateRiskRecommendations(factors: RiskAssessment['factors']): string[] {
    const recommendations: string[] = [];
    
    factors.forEach(factor => {
      if (factor.mitigation) {
        recommendations.push(factor.mitigation);
      }
    });

    return [...new Set(recommendations)]; // Remove duplicates
  }

  private estimateMaxDrawdown(portfolio: Portfolio): number {
    // Simplified max drawdown estimation
    return 0.15; // 15% placeholder
  }

  private estimateVolatility(portfolio: Portfolio): number {
    // Simplified volatility estimation
    return 0.25; // 25% placeholder
  }

  private calculateBeta(portfolio: Portfolio): number {
    // Simplified beta calculation
    return 1.2; // Placeholder
  }

  private calculateSortinoRatio(return_: number, volatility: number): number {
    const riskFreeRate = 0.02;
    return volatility > 0 ? (return_ - riskFreeRate) / volatility : 0;
  }

  private calculateSectorDistribution(positions: Position[]): Record<string, number> {
    // Simplified sector distribution
    return {
      'DeFi': 0.4,
      'Layer 1': 0.3,
      'Infrastructure': 0.2,
      'Other': 0.1
    };
  }

  private calculateCorrelationMatrix(positions: Position[]): Record<string, Record<string, number>> {
    // Simplified correlation matrix
    const matrix: Record<string, Record<string, number>> = {};
    positions.forEach(pos => {
      matrix[pos.token.symbol] = {};
      positions.forEach(otherPos => {
        matrix[pos.token.symbol][otherPos.token.symbol] = 
          pos.token.symbol === otherPos.token.symbol ? 1 : 0.3; // Placeholder
      });
    });
    return matrix;
  }

  private generateDiversificationRecommendations(
    concentrationRisk: number,
    numPositions: number,
    sectorDistribution: Record<string, number>
  ): string[] {
    const recommendations: string[] = [];

    if (concentrationRisk > 0.7) {
      recommendations.push('Consider adding more positions to reduce concentration risk');
    }

    if (numPositions < 5) {
      recommendations.push('Add more diverse assets to improve portfolio diversification');
    }

    return recommendations;
  }

  private calculateTargetAllocations(portfolio: Portfolio): Record<string, number> {
    // Simplified target allocation calculation
    const targetAllocations: Record<string, number> = {};
    const numPositions = portfolio.positions.length;
    const equalWeight = 1 / numPositions;

    portfolio.positions.forEach(pos => {
      // Adjust based on risk profile and market conditions
      let targetWeight = equalWeight;
      
      if (portfolio.riskProfile.tolerance === 'conservative') {
        // Favor more stable assets
        if (pos.token.symbol === 'USDC' || pos.token.symbol === 'USDT') {
          targetWeight *= 1.5;
        }
      }

      targetAllocations[pos.token.address] = Math.min(targetWeight, 0.3); // Cap at 30%
    });

    return targetAllocations;
  }

  private calculateExpectedImpact(
    position: Position,
    targetAllocation: number,
    marketData?: MarketCondition
  ): number {
    // Simplified expected impact calculation
    const difference = Math.abs(position.allocation - targetAllocation);
    const marketMultiplier = marketData?.trend === 'bullish' ? 1.2 : 
                            marketData?.trend === 'bearish' ? 0.8 : 1.0;
    
    return difference * 100 * marketMultiplier;
  }

  private calculateRecommendationRisk(
    position: Position,
    action: 'buy' | 'sell',
    marketData?: MarketCondition
  ): RiskLevel {
    // Simplified risk calculation
    if (marketData?.volatility && marketData.volatility > 0.4) {
      return 'high';
    }
    
    if (position.allocation > 0.2) {
      return 'medium';
    }

    return 'low';
  }
}
