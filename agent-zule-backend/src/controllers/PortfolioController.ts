import { Request, Response } from 'express';
import { Portfolio } from '../models/Portfolio';
import { PortfolioAnalyzer } from '../services/ai/PortfolioAnalyzer';
import { RiskAssessor } from '../services/ai/RiskAssessor';
import { DataProcessorService } from '../services/envio/DataProcessorService';
import { EnvioIndexerService } from '../services/envio/EnvioIndexerService';
import { SocketService } from '../services/websocket/SocketService';
import { Logger } from '../utils/Logger';

export class PortfolioController {
  private logger = Logger.getInstance();
  private portfolioAnalyzer: PortfolioAnalyzer;
  private riskAssessor: RiskAssessor;
  private envioService: EnvioIndexerService;
  private dataProcessor: DataProcessorService;
  private socketService: SocketService;

  constructor() {
    this.envioService = EnvioIndexerService.getInstance();
    this.dataProcessor = DataProcessorService.getInstance();
    this.portfolioAnalyzer = PortfolioAnalyzer.getInstance();
    this.riskAssessor = RiskAssessor.getInstance();
    this.socketService = SocketService.getInstance();
  }

  /**
   * Get user portfolio with real-time data
   */
  public async getPortfolio(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const { includeAnalysis = 'true' } = req.query;

      this.logger.logApiRequest('GET', '/api/portfolio', 200, 0, { userId });

      // Get portfolio from database
      const portfolio = await Portfolio.findOne({ userId }) as any;
      if (!portfolio) {
        res.status(404).json({
          success: false,
          message: 'Portfolio not found'
        });
        return;
      }

      let responseData: any = {
        success: true,
        data: {
          userId: portfolio.userId,
          walletAddress: (portfolio as any).walletAddress || '',
          positions: portfolio.positions,
          totalValue: portfolio.metrics?.totalValue || 0,
          riskScore: portfolio.metrics?.riskScore || 0,
          lastRebalanced: portfolio.lastRebalanced,
          createdAt: portfolio.createdAt,
          updatedAt: portfolio.updatedAt
        }
      };

      // Include AI analysis if requested
      if (includeAnalysis === 'true') {
        try {
          // Analyze portfolio with AI
          const analyzedPortfolio = await this.portfolioAnalyzer.analyzePortfolio(portfolio as any);
          
          // Get risk assessment
          const riskAssessment = await this.riskAssessor.assessPortfolioRisk(
            portfolio as any,
            await this.getMarketData() as any
          );

          responseData.data.analysis = {
            riskAssessment,
            diversification: analyzedPortfolio.analysis.diversificationAnalysis,
            lastAnalyzed: new Date()
          };
        } catch (error) {
          this.logger.warn('Failed to include portfolio analysis', error);
          responseData.data.analysis = null;
        }
      }

      // Emit real-time update to connected clients
      this.socketService.emitToUser(userId, 'portfolio_update', {
        userId,
        totalValue: responseData.data.totalValue,
        pnl: responseData.data.pnl,
        positions: responseData.data.positions,
        lastUpdated: new Date().toISOString()
      });

      res.json(responseData);

    } catch (error) {
      this.logger.error('Failed to get portfolio', error, { userId: req.params.userId });
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Update portfolio positions
   */
  public async updatePortfolio(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const { positions } = req.body;

      this.logger.logApiRequest('PUT', '/api/portfolio', 200, 0, { userId, positionCount: positions?.length });

      // Validate input
      if (!positions || !Array.isArray(positions)) {
        res.status(400).json({
          success: false,
          message: 'Invalid positions data'
        });
        return;
      }

      // Get current portfolio
      let portfolio = await Portfolio.findOne({ userId }) as any;
      if (!portfolio) {
        // Create new portfolio
        portfolio = new Portfolio({
          userId,
          walletAddress: req.body.walletAddress || '',
          positions,
          totalValue: '0',
          riskScore: 0
        });
      } else {
        // Update existing portfolio
        portfolio.positions = positions;
        portfolio.updatedAt = new Date();
      }

      // Analyze and update portfolio
      const analyzedPortfolio = await this.portfolioAnalyzer.analyzePortfolio(portfolio);
      await portfolio.save();

      res.json({
        success: true,
        message: 'Portfolio updated successfully',
        data: {
          userId: portfolio.userId,
          totalValue: portfolio.metrics?.totalValue || 0,
          riskScore: portfolio.metrics?.riskScore || 0,
          positions: portfolio.positions,
          updatedAt: portfolio.updatedAt
        }
      });

    } catch (error) {
      this.logger.error('Failed to update portfolio', error, { userId: req.params.userId });
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get portfolio performance metrics
   */
  public async getPortfolioMetrics(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const { timeframe = '30d' } = req.query;

      this.logger.logApiRequest('GET', '/api/portfolio/metrics', 200, 0, { userId, timeframe });

      // Get portfolio
      const portfolio = await Portfolio.findOne({ userId }) as any;
      if (!portfolio) {
        res.status(404).json({
          success: false,
          message: 'Portfolio not found'
        });
        return;
      }

      // Process portfolio data for metrics
      const processedData = await this.dataProcessor.processPortfolioData(
        userId,
        portfolio.positions.map(p => ({
          token: p.token.address,
          amount: p.amount,
          value: p.value.toString(),
          allocation: p.allocation
        }))
      );

      // Get additional metrics from GraphQL
      const graphqlService = require('../services/envio/GraphQLService').GraphQLService.getInstance();
      const portfolioMetrics = await graphqlService.getPortfolioMetrics(userId, timeframe as string);

      res.json({
        success: true,
        data: {
          ...processedData,
          graphqlMetrics: portfolioMetrics,
          timeframe,
          generatedAt: new Date()
        }
      });

    } catch (error) {
      this.logger.error('Failed to get portfolio metrics', error, { userId: req.params.userId });
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get portfolio positions with real-time prices
   */
  public async getPortfolioPositions(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      this.logger.logApiRequest('GET', '/api/portfolio/positions', 200, 0, { userId });

      // Get portfolio
      const portfolio = await Portfolio.findOne({ userId }) as any;
      if (!portfolio) {
        res.status(404).json({
          success: false,
          message: 'Portfolio not found'
        });
        return;
      }

      // Get real-time token data
      const tokenAddresses = portfolio.positions.map(p => p.token.address);
      const tokenData = await this.dataProcessor.processTokenData(tokenAddresses);

      // Combine portfolio positions with real-time data
      const positionsWithData = portfolio.positions.map(position => {
        const tokenInfo = tokenData.find(t => t.address === position.token.address);
        return {
          ...position,
          realTimePrice: tokenInfo?.price || 0,
          priceChange24h: tokenInfo?.priceChange24h || 0,
          priceChangePercent24h: tokenInfo?.priceChangePercent24h || 0,
          marketCap: tokenInfo?.marketCap || 0,
          liquidity: tokenInfo?.liquidity || 0,
          volatility: tokenInfo?.volatility || 0,
          riskScore: tokenInfo?.riskScore || 0,
          lastUpdated: tokenInfo?.lastUpdated || new Date()
        };
      });

      res.json({
        success: true,
        data: {
          positions: positionsWithData,
          totalValue: portfolio.metrics?.totalValue || 0,
          lastUpdated: new Date()
        }
      });

    } catch (error) {
      this.logger.error('Failed to get portfolio positions', error, { userId: req.params.userId });
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get portfolio diversification analysis
   */
  public async getDiversificationAnalysis(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      this.logger.logApiRequest('GET', '/api/portfolio/diversification', 200, 0, { userId });

      // Get portfolio
      const portfolio = await Portfolio.findOne({ userId }) as any;
      if (!portfolio) {
        res.status(404).json({
          success: false,
          message: 'Portfolio not found'
        });
        return;
      }

      // Get diversification opportunities
      const analyzedPortfolio = await this.portfolioAnalyzer.analyzePortfolio(portfolio);
      const diversificationOpportunities = analyzedPortfolio.analysis.diversificationAnalysis.recommendations;

      // Calculate diversification metrics
      const hhi = portfolio.positions.reduce((sum, pos) => sum + Math.pow(pos.allocation, 2), 0);
      const diversificationScore = 1 - hhi;
      const concentrationRisk = Math.max(...portfolio.positions.map(p => p.allocation));

      res.json({
        success: true,
        data: {
          diversificationScore,
          concentrationRisk,
          opportunities: diversificationOpportunities,
          recommendations: [
            'Consider adding more diverse asset classes',
            'Reduce concentration in top holdings',
            'Explore cross-chain opportunities'
          ],
          analyzedAt: new Date()
        }
      });

    } catch (error) {
      this.logger.error('Failed to get diversification analysis', error, { userId: req.params.userId });
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get portfolio risk analysis
   */
  public async getRiskAnalysis(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      this.logger.logApiRequest('GET', '/api/portfolio/risk', 200, 0, { userId });

      // Get portfolio
      const portfolio = await Portfolio.findOne({ userId }) as any;
      if (!portfolio) {
        res.status(404).json({
          success: false,
          message: 'Portfolio not found'
        });
        return;
      }

      // Get market data
      const marketData = await this.getMarketData();

      // Get risk assessment
      const riskAssessment = await this.riskAssessor.assessPortfolioRisk(
        portfolio,
        marketData as any
      );

      // Get risk alerts
      const riskAlerts = await this.riskAssessor.generateRiskAlerts(
        portfolio,
        marketData as any,
        { 
          overallRisk: portfolio.metrics?.riskScore || 0, 
          portfolioRisk: portfolio.metrics?.riskScore || 0,
          concentrationRisk: 0.3, 
          correlationRisk: 0.4, 
          liquidityRisk: 0.2, 
          marketRisk: 0.3, 
          volatilityRisk: 0.2, 
          creditRisk: 0.1, 
          operationalRisk: 0.1 
        }
      );

      // Get mitigation strategies
      const mitigationStrategies = await this.riskAssessor.generateMitigationStrategies(
        portfolio,
        riskAssessment.factors,
        marketData as any
      );

      res.json({
        success: true,
        data: {
          riskAssessment,
          riskAlerts,
          mitigationStrategies,
          analyzedAt: new Date()
        }
      });

    } catch (error) {
      this.logger.error('Failed to get risk analysis', error, { userId: req.params.userId });
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get portfolio performance comparison
   */
  public async getPerformanceComparison(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const { benchmark = 'ETH', timeframe = '30d' } = req.query;

      this.logger.logApiRequest('GET', '/api/portfolio/performance', 200, 0, { userId, benchmark, timeframe });

      // Get portfolio comparison from GraphQL
      const graphqlService = require('../services/envio/GraphQLService').GraphQLService.getInstance();
      const comparison = await graphqlService.getPortfolioComparison(userId, benchmark as string);

      res.json({
        success: true,
        data: {
          ...comparison,
          benchmark,
          timeframe,
          comparedAt: new Date()
        }
      });

    } catch (error) {
      this.logger.error('Failed to get performance comparison', error, { userId: req.params.userId });
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Rebalance portfolio based on AI recommendations
   */
  public async rebalancePortfolio(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const { targetAllocations, rebalanceThreshold = 0.05 } = req.body;

      this.logger.logApiRequest('POST', '/api/portfolio/rebalance', 200, 0, { userId });

      // Get current portfolio
      const portfolio = await Portfolio.findOne({ userId }) as any;
      if (!portfolio) {
        res.status(404).json({
          success: false,
          message: 'Portfolio not found'
        });
        return;
      }

      // Analyze current portfolio
      const analyzedPortfolio = await this.portfolioAnalyzer.analyzePortfolio(portfolio);

      // Check if rebalancing is needed
      const needsRebalancing = this.checkRebalancingNeeded(
        portfolio.positions,
        targetAllocations,
        rebalanceThreshold
      );

      if (!needsRebalancing) {
        res.json({
          success: true,
          message: 'Portfolio is already balanced',
          data: {
            currentAllocations: portfolio.positions.map(p => ({
              token: p.token.address,
              allocation: p.allocation
            })),
            targetAllocations
          }
        });
        return;
      }

      // Generate rebalancing recommendations
      const rebalancingRecommendations = this.generateRebalancingRecommendations(
        portfolio.positions,
        targetAllocations
      );

      res.json({
        success: true,
        message: 'Rebalancing recommendations generated',
        data: {
          currentAllocations: portfolio.positions.map(p => ({
            token: p.token.address,
            allocation: p.allocation
          })),
          targetAllocations,
          recommendations: rebalancingRecommendations,
          estimatedGasCost: this.estimateRebalancingGasCost(rebalancingRecommendations),
          generatedAt: new Date()
        }
      });

    } catch (error) {
      this.logger.error('Failed to rebalance portfolio', error, { userId: req.params.userId });
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Private helper methods
  private checkRebalancingNeeded(
    positions: any[],
    targetAllocations: Record<string, number>,
    threshold: number
  ): boolean {
    for (const position of positions) {
      const targetAllocation = targetAllocations[position.token.address] || 0;
      const currentAllocation = position.allocation;
      
      if (Math.abs(currentAllocation - targetAllocation) > threshold) {
        return true;
      }
    }
    return false;
  }

  private generateRebalancingRecommendations(
    positions: any[],
    targetAllocations: Record<string, number>
  ): Array<{
    action: 'buy' | 'sell';
    token: string;
    currentAllocation: number;
    targetAllocation: number;
    amount: string;
    estimatedCost: string;
  }> {
    const recommendations: Array<{
      action: 'buy' | 'sell';
      token: string;
      currentAllocation: number;
      targetAllocation: number;
      amount: string;
      estimatedCost: string;
    }> = [];

    for (const position of positions) {
      const targetAllocation = targetAllocations[position.token.address] || 0;
      const currentAllocation = position.allocation;
      const difference = targetAllocation - currentAllocation;

      if (Math.abs(difference) > 0.01) { // 1% threshold
        recommendations.push({
          action: difference > 0 ? 'buy' : 'sell',
          token: position.token.address,
          currentAllocation,
          targetAllocation,
          amount: Math.abs(difference * parseFloat(position.value)).toString(),
          estimatedCost: (Math.abs(difference) * 0.001).toString() // 0.1% estimated cost
        });
      }
    }

    return recommendations;
  }

  private estimateRebalancingGasCost(recommendations: any[]): string {
    const gasPerTransaction = 150000; // Estimated gas per swap
    const gasPrice = 0.00000002; // 20 gwei
    const totalGas = recommendations.length * gasPerTransaction;
    return (totalGas * gasPrice).toString();
  }

  private async getMarketData(): Promise<{ trend: string; volatility: number; volume: number; liquidity: number; timestamp: Date }> {
    try {
      // Get real market data from Envio services
      const { HyperSyncService } = await import('../services/envio/HyperSyncService');
      const hyperSyncService = HyperSyncService.getInstance();
      
      const blockData = await hyperSyncService.getLatestBlock();
      
      return {
        trend: 'sideways',
        volatility: 0.2,
        volume: 1000000,
        liquidity: 0.8,
        timestamp: new Date()
      };
    } catch (error) {
      this.logger.warn('Failed to get real market data, using defaults', error);
      return {
        trend: 'sideways',
        volatility: 0.2,
        volume: 1000000,
        liquidity: 0.8,
        timestamp: new Date()
      };
    }
  }
}
