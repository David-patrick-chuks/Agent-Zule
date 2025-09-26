import { Request, Response } from 'express';
import { Logger } from '../utils/Logger';
import { PortfolioAnalyzer } from '../services/ai/PortfolioAnalyzer';
import { YieldOptimizer } from '../services/ai/YieldOptimizer';
import { DCAManager } from '../services/ai/DCAManager';
import { RiskAssessor } from '../services/ai/RiskAssessor';
import { MarketPredictor } from '../services/ai/MarketPredictor';
import { EnvioIndexerService } from '../services/envio/EnvioIndexerService';
import { Recommendation } from '../models/Recommendation';
import { Portfolio } from '../models/Portfolio';

export class RecommendationController {
  private logger = Logger.getInstance();
  private portfolioAnalyzer: PortfolioAnalyzer;
  private yieldOptimizer: YieldOptimizer;
  private dcaManager: DCAManager;
  private riskAssessor: RiskAssessor;
  private marketPredictor: MarketPredictor;
  private envioService: EnvioIndexerService;

  constructor() {
    this.envioService = EnvioIndexerService.getInstance();
    this.portfolioAnalyzer = new PortfolioAnalyzer(this.envioService);
    this.yieldOptimizer = new YieldOptimizer(this.envioService);
    this.dcaManager = DCAManager.getInstance();
    this.riskAssessor = RiskAssessor.getInstance();
    this.marketPredictor = MarketPredictor.getInstance();
  }

  /**
   * Get AI recommendations for user
   */
  public async getRecommendations(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const { type, status = 'pending', limit = 20, offset = 0 } = req.query;

      this.logger.logApiRequest('GET', '/api/recommendations', 200, 0, { userId, type, status });

      // Build query
      const query: any = { userId };
      if (type) query.type = type;
      if (status) query.status = status;

      // Get recommendations from database
      const recommendations = await Recommendation.find(query)
        .sort({ createdAt: -1 })
        .limit(parseInt(limit as string))
        .skip(parseInt(offset as string));

      res.json({
        success: true,
        data: {
          recommendations,
          total: recommendations.length,
          pagination: {
            limit: parseInt(limit as string),
            offset: parseInt(offset as string),
            hasMore: recommendations.length === parseInt(limit as string)
          }
        }
      });

    } catch (error) {
      this.logger.error('Failed to get recommendations', error, { userId: req.params.userId });
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Generate new AI recommendations
   */
  public async generateRecommendations(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const { force = false } = req.query;

      this.logger.logApiRequest('POST', '/api/recommendations/generate', 200, 0, { userId, force });

      // Get user portfolio
      const portfolio = await Portfolio.findOne({ userId });
      if (!portfolio) {
        res.status(404).json({
          success: false,
          message: 'Portfolio not found'
        });
        return;
      }

      // Check if recent recommendations exist (unless forced)
      if (!force) {
        const recentRecommendations = await Recommendation.find({
          userId,
          createdAt: { $gte: new Date(Date.now() - 60 * 60 * 1000) } // Last hour
        });

        if (recentRecommendations.length > 0) {
          res.json({
            success: true,
            message: 'Recent recommendations already exist',
            data: {
              existingRecommendations: recentRecommendations.length,
              lastGenerated: recentRecommendations[0].createdAt
            }
          });
          return;
        }
      }

      // Generate recommendations from all AI services
      const allRecommendations = await this.generateAllRecommendations(userId, portfolio);

      // Save recommendations to database
      const savedRecommendations = await Recommendation.insertMany(allRecommendations);

      res.json({
        success: true,
        message: 'Recommendations generated successfully',
        data: {
          recommendations: savedRecommendations,
          count: savedRecommendations.length,
          generatedAt: new Date()
        }
      });

    } catch (error) {
      this.logger.error('Failed to generate recommendations', error, { userId: req.params.userId });
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get specific recommendation details
   */
  public async getRecommendation(req: Request, res: Response): Promise<void> {
    try {
      const { recommendationId } = req.params;

      this.logger.logApiRequest('GET', '/api/recommendations/:id', 200, 0, { recommendationId });

      const recommendation = await Recommendation.findById(recommendationId);
      if (!recommendation) {
        res.status(404).json({
          success: false,
          message: 'Recommendation not found'
        });
        return;
      }

      res.json({
        success: true,
        data: recommendation
      });

    } catch (error) {
      this.logger.error('Failed to get recommendation', error, { recommendationId: req.params.recommendationId });
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Approve a recommendation
   */
  public async approveRecommendation(req: Request, res: Response): Promise<void> {
    try {
      const { recommendationId } = req.params;
      const { userConfirmation = false } = req.body;

      this.logger.logApiRequest('POST', '/api/recommendations/:id/approve', 200, 0, { recommendationId, userConfirmation });

      const recommendation = await Recommendation.findById(recommendationId);
      if (!recommendation) {
        res.status(404).json({
          success: false,
          message: 'Recommendation not found'
        });
        return;
      }

      if (recommendation.status !== 'pending') {
        res.status(400).json({
          success: false,
          message: 'Recommendation is not in pending status'
        });
        return;
      }

      // Update recommendation status
      recommendation.status = 'approved';
      recommendation.approvedAt = new Date();
      await recommendation.save();

      // Log the approval
      this.logger.logRecommendation(recommendationId, 'approved', {
        userId: recommendation.userId,
        type: recommendation.type,
        userConfirmation
      });

      res.json({
        success: true,
        message: 'Recommendation approved successfully',
        data: {
          recommendationId,
          status: recommendation.status,
          approvedAt: recommendation.approvedAt
        }
      });

    } catch (error) {
      this.logger.error('Failed to approve recommendation', error, { recommendationId: req.params.recommendationId });
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Reject a recommendation
   */
  public async rejectRecommendation(req: Request, res: Response): Promise<void> {
    try {
      const { recommendationId } = req.params;
      const { reason } = req.body;

      this.logger.logApiRequest('POST', '/api/recommendations/:id/reject', 200, 0, { recommendationId, reason });

      const recommendation = await Recommendation.findById(recommendationId);
      if (!recommendation) {
        res.status(404).json({
          success: false,
          message: 'Recommendation not found'
        });
        return;
      }

      if (recommendation.status !== 'pending') {
        res.status(400).json({
          success: false,
          message: 'Recommendation is not in pending status'
        });
        return;
      }

      // Update recommendation status
      recommendation.status = 'rejected';
      await recommendation.save();

      // Log the rejection
      this.logger.logRecommendation(recommendationId, 'rejected', {
        userId: recommendation.userId,
        type: recommendation.type,
        reason
      });

      res.json({
        success: true,
        message: 'Recommendation rejected successfully',
        data: {
          recommendationId,
          status: recommendation.status,
          rejectedAt: new Date()
        }
      });

    } catch (error) {
      this.logger.error('Failed to reject recommendation', error, { recommendationId: req.params.recommendationId });
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Vote on a recommendation (community voting)
   */
  public async voteOnRecommendation(req: Request, res: Response): Promise<void> {
    try {
      const { recommendationId } = req.params;
      const { vote, voterAddress } = req.body; // vote: 'up' | 'down'

      this.logger.logApiRequest('POST', '/api/recommendations/:id/vote', 200, 0, { recommendationId, vote, voterAddress });

      if (!['up', 'down'].includes(vote)) {
        res.status(400).json({
          success: false,
          message: 'Invalid vote. Must be "up" or "down"'
        });
        return;
      }

      const recommendation = await Recommendation.findById(recommendationId);
      if (!recommendation) {
        res.status(404).json({
          success: false,
          message: 'Recommendation not found'
        });
        return;
      }

      // Check if user already voted
      if (recommendation.communityVotes.voters.includes(voterAddress)) {
        res.status(400).json({
          success: false,
          message: 'User has already voted on this recommendation'
        });
        return;
      }

      // Update votes
      if (vote === 'up') {
        recommendation.communityVotes.upvotes += 1;
      } else {
        recommendation.communityVotes.downvotes += 1;
      }
      recommendation.communityVotes.voters.push(voterAddress);

      await recommendation.save();

      res.json({
        success: true,
        message: 'Vote recorded successfully',
        data: {
          recommendationId,
          upvotes: recommendation.communityVotes.upvotes,
          downvotes: recommendation.communityVotes.downvotes,
          totalVotes: recommendation.communityVotes.upvotes + recommendation.communityVotes.downvotes
        }
      });

    } catch (error) {
      this.logger.error('Failed to vote on recommendation', error, { recommendationId: req.params.recommendationId });
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get recommendation analytics
   */
  public async getRecommendationAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const { timeframe = '30d' } = req.query;

      this.logger.logApiRequest('GET', '/api/recommendations/analytics', 200, 0, { userId, timeframe });

      // Calculate timeframe
      const days = parseInt(timeframe as string.replace('d', ''));
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      // Get analytics data
      const analytics = await Recommendation.aggregate([
        {
          $match: {
            userId,
            createdAt: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: null,
            totalRecommendations: { $sum: 1 },
            approvedRecommendations: {
              $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] }
            },
            rejectedRecommendations: {
              $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] }
            },
            executedRecommendations: {
              $sum: { $cond: [{ $eq: ['$status', 'executed'] }, 1, 0] }
            },
            averageVotes: {
              $avg: { $add: ['$communityVotes.upvotes', '$communityVotes.downvotes'] }
            },
            byType: {
              $push: {
                type: '$type',
                status: '$status'
              }
            }
          }
        }
      ]);

      const result = analytics[0] || {
        totalRecommendations: 0,
        approvedRecommendations: 0,
        rejectedRecommendations: 0,
        executedRecommendations: 0,
        averageVotes: 0,
        byType: []
      };

      // Calculate additional metrics
      const approvalRate = result.totalRecommendations > 0 ? 
        (result.approvedRecommendations / result.totalRecommendations) * 100 : 0;
      const executionRate = result.totalRecommendations > 0 ? 
        (result.executedRecommendations / result.totalRecommendations) * 100 : 0;

      res.json({
        success: true,
        data: {
          ...result,
          approvalRate,
          executionRate,
          timeframe,
          generatedAt: new Date()
        }
      });

    } catch (error) {
      this.logger.error('Failed to get recommendation analytics', error, { userId: req.params.userId });
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get top performing recommendations
   */
  public async getTopRecommendations(req: Request, res: Response): Promise<void> {
    try {
      const { limit = 10 } = req.query;

      this.logger.logApiRequest('GET', '/api/recommendations/top', 200, 0, { limit });

      // Get top recommendations by community votes
      const topRecommendations = await Recommendation.find({
        status: { $in: ['approved', 'executed'] }
      })
        .sort({ 'communityVotes.upvotes': -1, createdAt: -1 })
        .limit(parseInt(limit as string));

      res.json({
        success: true,
        data: {
          recommendations: topRecommendations,
          count: topRecommendations.length
        }
      });

    } catch (error) {
      this.logger.error('Failed to get top recommendations', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Private helper methods
  private async generateAllRecommendations(
    userId: string,
    portfolio: any
  ): Promise<any[]> {
    const recommendations = [];

    try {
      // Generate yield optimization recommendations
      const yieldRecommendations = await this.yieldOptimizer.identifyYieldOpportunities(userId, portfolio);
      recommendations.push(...yieldRecommendations);

      // Generate DCA recommendations
      const dcaRecommendations = await this.dcaManager.analyzeAndRecommend(
        portfolio,
        { trend: 'sideways', volatility: 0.2, volume: 1000000 }
      );
      
      // Convert DCA recommendations to standard format
      for (const dcaRec of dcaRecommendations) {
        recommendations.push({
          id: `rec-${Date.now()}-${Math.random().toString(36).substring(7)}`,
          userId,
          type: 'dca',
          description: `DCA Strategy: ${dcaRec.reasoning}`,
          details: dcaRec,
          riskLevel: dcaRec.riskLevel,
          status: 'pending',
          communityVotes: { upvotes: 0, downvotes: 0, voters: [] },
          proposedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }

      // Generate market prediction recommendations
      const tokenAddresses = portfolio.positions.map((p: any) => p.token);
      const marketPredictions = await this.marketPredictor.predictPriceMovements(tokenAddresses);
      
      for (const prediction of marketPredictions) {
        if (prediction.confidence > 0.7 && Math.abs(prediction.priceChangePercentage) > 5) {
          recommendations.push({
            id: `rec-${Date.now()}-${Math.random().toString(36).substring(7)}`,
            userId,
            type: prediction.priceChangePercentage > 0 ? 'buy' : 'sell',
            description: `Market Prediction: ${prediction.symbol} predicted to ${prediction.priceChangePercentage > 0 ? 'increase' : 'decrease'} by ${Math.abs(prediction.priceChangePercentage).toFixed(2)}%`,
            details: prediction,
            riskLevel: prediction.confidence > 0.8 ? 'low' : 'medium',
            status: 'pending',
            communityVotes: { upvotes: 0, downvotes: 0, voters: [] },
            proposedAt: new Date(),
            createdAt: new Date(),
            updatedAt: new Date()
          });
        }
      }

    } catch (error) {
      this.logger.error('Error generating recommendations', error);
    }

    return recommendations;
  }
}
