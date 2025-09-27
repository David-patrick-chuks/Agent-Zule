import { Recommendation, IRecommendation } from '../models/Recommendation';
import { Logger } from '../utils/Logger';

export class RecommendationRepository {
  private logger = Logger.getInstance();

  /**
   * Create a new recommendation
   */
  public async create(recommendationData: Partial<IRecommendation>): Promise<IRecommendation> {
    try {
      this.logger.logDatabase('create', 'recommendations', 0, { userId: recommendationData.userId, type: recommendationData.type });

      const recommendation = new Recommendation(recommendationData);
      await recommendation.save();

      this.logger.logDatabase('create', 'recommendations', 0, { recommendationId: recommendation._id, userId: recommendation.userId });
      return recommendation;

    } catch (error) {
      this.logger.error('Failed to create recommendation', error, { userId: recommendationData.userId });
      throw error;
    }
  }

  /**
   * Find recommendation by ID
   */
  public async findById(recommendationId: string): Promise<IRecommendation | null> {
    try {
      this.logger.logDatabase('findById', 'recommendations', 0, { recommendationId });

      const recommendation = await Recommendation.findById(recommendationId);
      return recommendation;

    } catch (error) {
      this.logger.error('Failed to find recommendation by ID', error, { recommendationId });
      throw error;
    }
  }

  /**
   * Find recommendations by user ID
   */
  public async findByUserId(
    userId: string,
    limit: number = 50,
    offset: number = 0,
    filters?: Partial<IRecommendation>
  ): Promise<{ recommendations: IRecommendation[]; total: number }> {
    try {
      this.logger.logDatabase('find', 'recommendations', 0, { userId, limit, offset, filters });

      const query = { userId, ...filters };
      const [recommendations, total] = await Promise.all([
        Recommendation.find(query)
          .sort({ createdAt: -1 })
          .limit(limit)
          .skip(offset),
        Recommendation.countDocuments(query)
      ]);

      return { recommendations, total };

    } catch (error) {
      this.logger.error('Failed to find recommendations by user ID', error, { userId });
      throw error;
    }
  }

  /**
   * Find recommendations by type
   */
  public async findByType(
    type: IRecommendation['type'],
    limit: number = 50,
    offset: number = 0
  ): Promise<{ recommendations: IRecommendation[]; total: number }> {
    try {
      this.logger.logDatabase('find', 'recommendations', 0, { type, limit, offset });

      const query = { type };
      const [recommendations, total] = await Promise.all([
        Recommendation.find(query)
          .sort({ createdAt: -1 })
          .limit(limit)
          .skip(offset),
        Recommendation.countDocuments(query)
      ]);

      return { recommendations, total };

    } catch (error) {
      this.logger.error('Failed to find recommendations by type', error, { type });
      throw error;
    }
  }

  /**
   * Find recommendations by status
   */
  public async findByStatus(
    status: IRecommendation['status'],
    limit: number = 50,
    offset: number = 0
  ): Promise<{ recommendations: IRecommendation[]; total: number }> {
    try {
      this.logger.logDatabase('find', 'recommendations', 0, { status, limit, offset });

      const query = { status };
      const [recommendations, total] = await Promise.all([
        Recommendation.find(query)
          .sort({ createdAt: -1 })
          .limit(limit)
          .skip(offset),
        Recommendation.countDocuments(query)
      ]);

      return { recommendations, total };

    } catch (error) {
      this.logger.error('Failed to find recommendations by status', error, { status });
      throw error;
    }
  }

  /**
   * Update recommendation status
   */
  public async updateStatus(
    recommendationId: string,
    status: IRecommendation['status'],
    additionalData?: Partial<IRecommendation>
  ): Promise<IRecommendation | null> {
    try {
      this.logger.logDatabase('updateOne', 'recommendations', 0, { recommendationId, status });

      const updateData: any = { 
        status,
        updatedAt: new Date()
      };

      // Add timestamp based on status
      if (status === 'approved') {
        updateData.approvedAt = new Date();
      } else if (status === 'executed') {
        updateData.executedAt = new Date();
      }

      // Add additional data if provided
      if (additionalData) {
        Object.assign(updateData, additionalData);
      }

      const recommendation = await Recommendation.findByIdAndUpdate(
        recommendationId,
        { $set: updateData },
        { new: true }
      );

      return recommendation;

    } catch (error) {
      this.logger.error('Failed to update recommendation status', error, { recommendationId, status });
      throw error;
    }
  }

  /**
   * Add vote to recommendation
   */
  public async addVote(
    recommendationId: string,
    voterAddress: string,
    vote: 'up' | 'down'
  ): Promise<IRecommendation | null> {
    try {
      this.logger.logDatabase('updateOne', 'recommendations', 0, { recommendationId, voterAddress, vote });

      const recommendation = await Recommendation.findById(recommendationId);
      if (!recommendation) {
        throw new Error('Recommendation not found');
      }

      // Check if user already voted
      if (recommendation.communityVotes.voters.includes(voterAddress)) {
        throw new Error('User has already voted on this recommendation');
      }

      // Update votes
      if (vote === 'up') {
        recommendation.communityVotes.upvotes += 1;
      } else {
        recommendation.communityVotes.downvotes += 1;
      }
      recommendation.communityVotes.voters.push(voterAddress);

      await recommendation.save();

      return recommendation;

    } catch (error) {
      this.logger.error('Failed to add vote to recommendation', error, { recommendationId, voterAddress, vote });
      throw error;
    }
  }

  /**
   * Get recommendation statistics
   */
  public async getStats(
    userId?: string,
    timeframe?: '1d' | '7d' | '30d' | '90d'
  ): Promise<{
    totalRecommendations: number;
    approvedRecommendations: number;
    executedRecommendations: number;
    rejectedRecommendations: number;
    pendingRecommendations: number;
    averageVotes: number;
    approvalRate: number;
    executionRate: number;
    byType: Record<string, number>;
    byRiskLevel: Record<string, number>;
  }> {
    try {
      this.logger.logDatabase('aggregate', 'recommendations', 0, { userId, timeframe });

      // Calculate date filter
      let dateFilter = {};
      if (timeframe) {
        const days = parseInt(timeframe.replace('d', ''));
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        dateFilter = { createdAt: { $gte: startDate } };
      }

      const baseQuery = userId ? { userId, ...dateFilter } : dateFilter;

      const [
        totalRecommendations,
        approvedRecommendations,
        executedRecommendations,
        rejectedRecommendations,
        pendingRecommendations,
        averageVotes,
        byType,
        byRiskLevel
      ] = await Promise.all([
        Recommendation.countDocuments(baseQuery),
        Recommendation.countDocuments({ ...baseQuery, status: 'approved' }),
        Recommendation.countDocuments({ ...baseQuery, status: 'executed' }),
        Recommendation.countDocuments({ ...baseQuery, status: 'rejected' }),
        Recommendation.countDocuments({ ...baseQuery, status: 'pending' }),
        Recommendation.aggregate([
          { $match: baseQuery },
          { $group: { _id: null, avg: { $avg: { $add: ['$communityVotes.upvotes', '$communityVotes.downvotes'] } } } }
        ]),
        Recommendation.aggregate([
          { $match: baseQuery },
          { $group: { _id: '$type', count: { $sum: 1 } } }
        ]),
        Recommendation.aggregate([
          { $match: baseQuery },
          { $group: { _id: '$riskLevel', count: { $sum: 1 } } }
        ])
      ]);

      const approvalRate = totalRecommendations > 0 ? (approvedRecommendations / totalRecommendations) * 100 : 0;
      const executionRate = totalRecommendations > 0 ? (executedRecommendations / totalRecommendations) * 100 : 0;

      return {
        totalRecommendations,
        approvedRecommendations,
        executedRecommendations,
        rejectedRecommendations,
        pendingRecommendations,
        averageVotes: averageVotes[0]?.avg || 0,
        approvalRate,
        executionRate,
        byType: byType.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {} as Record<string, number>),
        byRiskLevel: byRiskLevel.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {} as Record<string, number>)
      };

    } catch (error) {
      this.logger.error('Failed to get recommendation stats', error, { userId, timeframe });
      throw error;
    }
  }

  /**
   * Get top recommendations by votes
   */
  public async getTopByVotes(
    limit: number = 10,
    timeframe?: '1d' | '7d' | '30d'
  ): Promise<IRecommendation[]> {
    try {
      this.logger.logDatabase('find', 'recommendations', 0, { limit, timeframe });

      let dateFilter = {};
      if (timeframe) {
        const days = parseInt(timeframe.replace('d', ''));
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        dateFilter = { createdAt: { $gte: startDate } };
      }

      const recommendations = await Recommendation.find(dateFilter)
        .sort({ 'communityVotes.upvotes': -1, createdAt: -1 })
        .limit(limit);

      return recommendations;

    } catch (error) {
      this.logger.error('Failed to get top recommendations by votes', error, { limit, timeframe });
      throw error;
    }
  }

  /**
   * Get recommendations needing attention
   */
  public async getNeedingAttention(
    limit: number = 20
  ): Promise<IRecommendation[]> {
    try {
      this.logger.logDatabase('find', 'recommendations', 0, { limit });

      // Get recommendations that are pending and have high community votes
      const recommendations = await Recommendation.find({
        status: 'pending',
        $expr: {
          $gt: [
            { $add: ['$communityVotes.upvotes', '$communityVotes.downvotes'] },
            5
          ]
        }
      })
        .sort({ 'communityVotes.upvotes': -1, createdAt: -1 })
        .limit(limit);

      return recommendations;

    } catch (error) {
      this.logger.error('Failed to get recommendations needing attention', error, { limit });
      throw error;
    }
  }

  /**
   * Get expired recommendations
   */
  public async getExpired(): Promise<IRecommendation[]> {
    try {
      this.logger.logDatabase('find', 'recommendations', 0, {});

      const now = new Date();
      const recommendations = await Recommendation.find({
        status: 'pending',
        expiresAt: { $lte: now }
      });

      return recommendations;

    } catch (error) {
      this.logger.error('Failed to get expired recommendations', error);
      throw error;
    }
  }

  /**
   * Update expired recommendations
   */
  public async updateExpired(): Promise<number> {
    try {
      this.logger.logDatabase('updateMany', 'recommendations', 0, {});

      const now = new Date();
      const result = await Recommendation.updateMany(
        {
          status: 'pending',
          expiresAt: { $lte: now }
        },
        {
          $set: {
            status: 'expired',
            updatedAt: now
          }
        }
      );

      this.logger.info(`Updated ${result.modifiedCount} expired recommendations`);
      return result.modifiedCount;

    } catch (error) {
      this.logger.error('Failed to update expired recommendations', error);
      throw error;
    }
  }

  /**
   * Delete recommendation
   */
  public async delete(recommendationId: string): Promise<boolean> {
    try {
      this.logger.logDatabase('deleteOne', 'recommendations', 0, { recommendationId });

      const result = await Recommendation.findByIdAndDelete(recommendationId);
      return !!result;

    } catch (error) {
      this.logger.error('Failed to delete recommendation', error, { recommendationId });
      throw error;
    }
  }

  /**
   * Get recommendation performance metrics
   */
  public async getPerformanceMetrics(
    userId: string,
    timeframe: '7d' | '30d' | '90d' = '30d'
  ): Promise<{
    totalGenerated: number;
    totalApproved: number;
    totalExecuted: number;
    averageApprovalTime: number;
    averageExecutionTime: number;
    successRate: number;
    topPerformingTypes: Array<{ type: string; count: number; successRate: number }>;
  }> {
    try {
      this.logger.logDatabase('aggregate', 'recommendations', 0, { userId, timeframe });

      const days = parseInt(timeframe.replace('d', ''));
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const query = { userId, createdAt: { $gte: startDate } };

      const [
        totalGenerated,
        totalApproved,
        totalExecuted,
        approvalTimes,
        executionTimes,
        byType
      ] = await Promise.all([
        Recommendation.countDocuments(query),
        Recommendation.countDocuments({ ...query, status: 'approved' }),
        Recommendation.countDocuments({ ...query, status: 'executed' }),
        Recommendation.aggregate([
          { $match: { ...query, approvedAt: { $exists: true } } },
          { $project: { approvalTime: { $subtract: ['$approvedAt', '$createdAt'] } } },
          { $group: { _id: null, avg: { $avg: '$approvalTime' } } }
        ]),
        Recommendation.aggregate([
          { $match: { ...query, executedAt: { $exists: true } } },
          { $project: { executionTime: { $subtract: ['$executedAt', '$approvedAt'] } } },
          { $group: { _id: null, avg: { $avg: '$executionTime' } } }
        ]),
        Recommendation.aggregate([
          { $match: query },
          { $group: { _id: '$type', count: { $sum: 1 }, executed: { $sum: { $cond: [{ $eq: ['$status', 'executed'] }, 1, 0] } } } }
        ])
      ]);

      const averageApprovalTime = approvalTimes[0]?.avg || 0;
      const averageExecutionTime = executionTimes[0]?.avg || 0;
      const successRate = totalGenerated > 0 ? (totalExecuted / totalGenerated) * 100 : 0;

      const topPerformingTypes = byType.map(item => ({
        type: item._id,
        count: item.count,
        successRate: item.count > 0 ? (item.executed / item.count) * 100 : 0
      })).sort((a, b) => b.successRate - a.successRate);

      return {
        totalGenerated,
        totalApproved,
        totalExecuted,
        averageApprovalTime,
        averageExecutionTime,
        successRate,
        topPerformingTypes
      };

    } catch (error) {
      this.logger.error('Failed to get recommendation performance metrics', error, { userId, timeframe });
      throw error;
    }
  }
}
