import { MarketCondition, RiskLevel } from '../../types/Common';
import { DiversificationAnalysis, PerformanceMetrics, Portfolio, PortfolioAnalysis, Position, RebalancingRecommendation, RiskAssessment } from '../../types/Portfolio';
import { Logger } from '../../utils/Logger';

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
        riskAssessment: riskAssessment || {
          score: 50,
          level: 'medium',
          factors: [],
          recommendations: []
        },
        performanceMetrics: performanceMetrics || {
          totalReturn: 0,
          annualizedReturn: 0,
          sharpeRatio: 0,
          maxDrawdown: 0,
          volatility: 0,
          beta: 1,
          alpha: 0
        },
        diversificationAnalysis: diversificationAnalysis || {
          score: 0,
          concentrationRisk: 1,
          sectorDistribution: {},
          tokenDistribution: {},
          correlationMatrix: {},
          recommendations: []
        },
        yieldAnalysis: {
          currentYield: 0,
          potentialYield: 0,
          yieldSources: [],
          optimizationOpportunities: []
        },
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

      const riskLevel: RiskLevel = riskScore > 75 ? RiskLevel.CRITICAL : 
                                   riskScore > 50 ? RiskLevel.HIGH : 
                                   riskScore > 25 ? RiskLevel.MEDIUM : RiskLevel.LOW;

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
        level: RiskLevel.MEDIUM,
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
            riskLevel: this.getRiskLevelString(position, action, marketData)
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
    if (portfolio.positions.length < 2) return 0;
    
    // Calculate average correlation between positions
    let totalCorrelation = 0;
    let pairCount = 0;
    
    for (let i = 0; i < portfolio.positions.length; i++) {
      for (let j = i + 1; j < portfolio.positions.length; j++) {
        const pos1 = portfolio.positions[i];
        const pos2 = portfolio.positions[j];
        
        // Calculate correlation based on token similarity and market cap
        const correlation = this.calculateTokenCorrelation(pos1, pos2);
        totalCorrelation += correlation;
        pairCount++;
      }
    }
    
    return pairCount > 0 ? totalCorrelation / pairCount : 0;
  }

  private calculateLiquidityRisk(portfolio: Portfolio): number {
    if (portfolio.positions.length === 0) return 0;
    
    // Calculate weighted average liquidity risk
    let totalWeightedRisk = 0;
    let totalWeight = 0;
    
    portfolio.positions.forEach(position => {
      const liquidityRisk = this.getTokenLiquidityRisk(position.token.symbol);
      const weight = position.allocation;
      
      totalWeightedRisk += liquidityRisk * weight;
      totalWeight += weight;
    });
    
    return totalWeight > 0 ? totalWeightedRisk / totalWeight : 0;
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
    if (portfolio.positions.length === 0) return 0;
    
    // Calculate weighted average max drawdown based on position volatility
    let totalWeightedDrawdown = 0;
    let totalWeight = 0;
    
    portfolio.positions.forEach(position => {
      const tokenVolatility = this.getTokenVolatility(position.token.symbol);
      const maxDrawdown = Math.min(tokenVolatility * 2, 0.5); // Cap at 50%
      const weight = position.allocation;
      
      totalWeightedDrawdown += maxDrawdown * weight;
      totalWeight += weight;
    });
    
    return totalWeight > 0 ? totalWeightedDrawdown / totalWeight : 0;
  }

  private estimateVolatility(portfolio: Portfolio): number {
    if (portfolio.positions.length === 0) return 0;
    
    // Calculate portfolio volatility using variance formula
    let totalWeightedVolatility = 0;
    let totalWeight = 0;
    
    portfolio.positions.forEach(position => {
      const tokenVolatility = this.getTokenVolatility(position.token.symbol);
      const weight = position.allocation;
      
      totalWeightedVolatility += tokenVolatility * weight;
      totalWeight += weight;
    });
    
    const averageVolatility = totalWeight > 0 ? totalWeightedVolatility / totalWeight : 0;
    
    // Add diversification benefit (reduces volatility)
    const diversificationFactor = Math.max(0.5, 1 - (portfolio.positions.length - 1) * 0.1);
    
    return averageVolatility * diversificationFactor;
  }

  private calculateBeta(portfolio: Portfolio): number {
    if (portfolio.positions.length === 0) return 1;
    
    // Calculate weighted average beta
    let totalWeightedBeta = 0;
    let totalWeight = 0;
    
    portfolio.positions.forEach(position => {
      const tokenBeta = this.getTokenBeta(position.token.symbol);
      const weight = position.allocation;
      
      totalWeightedBeta += tokenBeta * weight;
      totalWeight += weight;
    });
    
    return totalWeight > 0 ? totalWeightedBeta / totalWeight : 1;
  }

  private calculateSortinoRatio(return_: number, volatility: number): number {
    const riskFreeRate = 0.02;
    return volatility > 0 ? (return_ - riskFreeRate) / volatility : 0;
  }

  // Helper methods for token analysis
  private calculateTokenCorrelation(pos1: Position, pos2: Position): number {
    // Simplified correlation calculation based on token characteristics
    const token1 = pos1.token;
    const token2 = pos2.token;
    
    // Same token = perfect correlation
    if (token1 === token2) return 1;
    
    // Different token types have different correlations
    const token1Type = this.getTokenType(token1.symbol);
    const token2Type = this.getTokenType(token2.symbol);
    
    if (token1Type === token2Type) {
      return 0.7; // High correlation for same type
    } else if (this.areTokensRelated(token1.symbol, token2.symbol)) {
      return 0.5; // Medium correlation for related tokens
    } else {
      return 0.2; // Low correlation for unrelated tokens
    }
  }

  private getTokenLiquidityRisk(token: string): number {
    // Return liquidity risk based on token characteristics
    const tokenType = this.getTokenType(token);
    
    switch (tokenType) {
      case 'major': return 0.1; // Low risk for major tokens
      case 'stable': return 0.05; // Very low risk for stablecoins
      case 'mid': return 0.3; // Medium risk for mid-cap tokens
      case 'small': return 0.6; // High risk for small-cap tokens
      default: return 0.4; // Default medium risk
    }
  }

  private getTokenVolatility(token: string): number {
    // Return historical volatility based on token type
    const tokenType = this.getTokenType(token);
    
    switch (tokenType) {
      case 'major': return 0.3; // 30% volatility for major tokens
      case 'stable': return 0.05; // 5% volatility for stablecoins
      case 'mid': return 0.6; // 60% volatility for mid-cap tokens
      case 'small': return 0.8; // 80% volatility for small-cap tokens
      default: return 0.5; // 50% default volatility
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

  private getTokenType(token: string): string {
    // Simplified token classification
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
          pos.token.symbol === otherPos.token.symbol ? 1 : this.calculateTokenCorrelation(pos, otherPos);
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
      
      if (portfolio.riskProfile.tolerance === 'low') {
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
  ): 'low' | 'medium' | 'high' {
    // Simplified risk calculation
    if (marketData?.volatility && marketData.volatility > 0.4) {
      return 'high';
    }
    
    if (position.allocation > 0.2) {
      return 'medium';
    }

    return 'low';
  }

  private getRiskLevelString(
    position: Position,
    action: 'buy' | 'sell',
    marketData?: MarketCondition
  ): 'low' | 'medium' | 'high' {
    if (marketData?.volatility && marketData.volatility > 0.4) {
      return 'high';
    }
    
    if (position.allocation > 0.2) {
      return 'medium';
    }

    return 'low';
  }
}
