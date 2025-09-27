import { Database } from '@envio/database';
import { Logger } from '../../utils/Logger';

interface RecommendationEvent {
  id: string;
  userId: string;
  type: string;
  status: string;
  blockNumber: number;
  transactionHash: string;
  timestamp: number;
  data: {
    description: string;
    details: string;
    riskLevel: string;
    communityVotes: {
      upvotes: number;
      downvotes: number;
      voters: string[];
    };
    proposedAt: string;
    approvedAt?: string;
    executedAt?: string;
    expiresAt: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface RecommendationStats {
  totalRecommendations: number;
  approvedRecommendations: number;
  executedRecommendations: number;
  rejectedRecommendations: number;
  averageVotes: number;
  approvalRate: number;
  executionRate: number;
  byType: Array<{
    type: string;
    count: number;
    successRate: number;
  }>;
  byRiskLevel: Array<{
    riskLevel: string;
    count: number;
    successRate: number;
  }>;
}

export class RecommendationService {
  private static db = new Database();
  private static logger = Logger.getInstance();

  // Get recommendation data
  static async getRecommendation(recommendationId: string): Promise<RecommendationEvent | null> {
    try {
      const result = await this.db.query(`
        SELECT * FROM recommendation_events 
        WHERE id = $1
      `, [recommendationId]);

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToRecommendationEvent(result.rows[0]);
    } catch (error) {
      this.logger.error('Error getting recommendation:', error);
      throw error;
    }
  }

  // Create recommendation event
  static async createRecommendationEvent(eventData: {
    userId: string;
    type: string;
    status: string;
    blockNumber: number;
    transactionHash: string;
    timestamp: number;
    data: any;
  }): Promise<RecommendationEvent> {
    try {
      const result = await this.db.query(`
        INSERT INTO recommendation_events (
          user_id, type, status, block_number, transaction_hash, 
          timestamp, data, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
        RETURNING *
      `, [
        eventData.userId,
        eventData.type,
        eventData.status,
        eventData.blockNumber,
        eventData.transactionHash,
        eventData.timestamp,
        JSON.stringify(eventData.data)
      ]);

      const recommendationEvent = this.mapRowToRecommendationEvent(result.rows[0]);
      this.logger.info(`Recommendation event created: ${eventData.type} for user ${eventData.userId}`);
      return recommendationEvent;
    } catch (error) {
      this.logger.error('Error creating recommendation event:', error);
      throw error;
    }
  }

  // Update recommendation
  static async updateRecommendation(recommendationId: string, recommendationData: any): Promise<RecommendationEvent> {
    try {
      const result = await this.db.query(`
        UPDATE recommendation_events 
        SET data = $1, status = $2, updated_at = NOW()
        WHERE id = $3
        RETURNING *
      `, [
        JSON.stringify(recommendationData.data),
        recommendationData.status,
        recommendationId
      ]);

      if (result.rows.length === 0) {
        throw new Error(`Recommendation not found: ${recommendationId}`);
      }

      const recommendationEvent = this.mapRowToRecommendationEvent(result.rows[0]);
      this.logger.info(`Recommendation updated: ${recommendationId}`);
      return recommendationEvent;
    } catch (error) {
      this.logger.error('Error updating recommendation:', error);
      throw error;
    }
  }

  // Delete recommendation
  static async deleteRecommendation(recommendationId: string): Promise<void> {
    try {
      await this.db.query(`
        DELETE FROM recommendation_events WHERE id = $1
      `, [recommendationId]);

      this.logger.info(`Recommendation deleted: ${recommendationId}`);
    } catch (error) {
      this.logger.error('Error deleting recommendation:', error);
      throw error;
    }
  }

  // Get recommendation metrics
  static async getRecommendationMetrics(userId?: string): Promise<RecommendationStats> {
    try {
      const whereClause = userId ? 'WHERE user_id = $1' : '';
      const params = userId ? [userId] : [];

      const result = await this.db.query(`
        SELECT 
          COUNT(*) as total_recommendations,
          COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_recommendations,
          COUNT(CASE WHEN status = 'executed' THEN 1 END) as executed_recommendations,
          COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_recommendations,
          AVG(CAST(data->'communityVotes'->>'upvotes' AS NUMERIC) + 
              CAST(data->'communityVotes'->>'downvotes' AS NUMERIC)) as average_votes
        FROM recommendation_events 
        ${whereClause}
        AND timestamp > EXTRACT(EPOCH FROM NOW() - INTERVAL '30 days')
      `, params);

      const metrics = result.rows[0];
      const total = parseInt(metrics.total_recommendations);
      const approved = parseInt(metrics.approved_recommendations);
      const executed = parseInt(metrics.executed_recommendations);

      return {
        totalRecommendations: total,
        approvedRecommendations: approved,
        executedRecommendations: executed,
        rejectedRecommendations: parseInt(metrics.rejected_recommendations),
        averageVotes: parseFloat(metrics.average_votes) || 0,
        approvalRate: total > 0 ? (approved / total) * 100 : 0,
        executionRate: approved > 0 ? (executed / approved) * 100 : 0,
        byType: await this.getRecommendationStatsByType(userId),
        byRiskLevel: await this.getRecommendationStatsByRiskLevel(userId)
      };
    } catch (error) {
      this.logger.error('Error getting recommendation metrics:', error);
      throw error;
    }
  }

  // Update recommendation metrics
  static async updateRecommendationMetrics(userId: string, metrics: any): Promise<void> {
    try {
      await this.db.query(`
        INSERT INTO recommendation_metrics (
          user_id, total_recommendations, approved_recommendations, 
          executed_recommendations, approval_rate, execution_rate,
          created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
        ON CONFLICT (user_id) 
        DO UPDATE SET 
          total_recommendations = EXCLUDED.total_recommendations,
          approved_recommendations = EXCLUDED.approved_recommendations,
          executed_recommendations = EXCLUDED.executed_recommendations,
          approval_rate = EXCLUDED.approval_rate,
          execution_rate = EXCLUDED.execution_rate,
          updated_at = NOW()
      `, [
        userId,
        metrics.totalRecommendations || 0,
        metrics.approvedRecommendations || 0,
        metrics.executedRecommendations || 0,
        metrics.approvalRate || 0,
        metrics.executionRate || 0
      ]);

      this.logger.info(`Recommendation metrics updated for user ${userId}`);
    } catch (error) {
      this.logger.error('Error updating recommendation metrics:', error);
      throw error;
    }
  }

  // Get recommendation stats by type
  private static async getRecommendationStatsByType(userId?: string): Promise<Array<{type: string, count: number, successRate: number}>> {
    try {
      const whereClause = userId ? 'WHERE user_id = $1' : '';
      const params = userId ? [userId] : [];

      const result = await this.db.query(`
        SELECT 
          type,
          COUNT(*) as count,
          COUNT(CASE WHEN status = 'executed' THEN 1 END) as successful
        FROM recommendation_events 
        ${whereClause}
        AND timestamp > EXTRACT(EPOCH FROM NOW() - INTERVAL '30 days')
        GROUP BY type
      `, params);

      return result.rows.map(row => ({
        type: row.type,
        count: parseInt(row.count),
        successRate: parseInt(row.count) > 0 ? (parseInt(row.successful) / parseInt(row.count)) * 100 : 0
      }));
    } catch (error) {
      this.logger.error('Error getting recommendation stats by type:', error);
      return [];
    }
  }

  // Get recommendation stats by risk level
  private static async getRecommendationStatsByRiskLevel(userId?: string): Promise<Array<{riskLevel: string, count: number, successRate: number}>> {
    try {
      const whereClause = userId ? 'WHERE user_id = $1' : '';
      const params = userId ? [userId] : [];

      const result = await this.db.query(`
        SELECT 
          data->>'riskLevel' as risk_level,
          COUNT(*) as count,
          COUNT(CASE WHEN status = 'executed' THEN 1 END) as successful
        FROM recommendation_events 
        ${whereClause}
        AND timestamp > EXTRACT(EPOCH FROM NOW() - INTERVAL '30 days')
        GROUP BY data->>'riskLevel'
      `, params);

      return result.rows.map(row => ({
        riskLevel: row.risk_level,
        count: parseInt(row.count),
        successRate: parseInt(row.count) > 0 ? (parseInt(row.successful) / parseInt(row.count)) * 100 : 0
      }));
    } catch (error) {
      this.logger.error('Error getting recommendation stats by risk level:', error);
      return [];
    }
  }

  // Helper method to map database row to RecommendationEvent
  private static mapRowToRecommendationEvent(row: any): RecommendationEvent {
    return {
      id: row.id,
      userId: row.user_id,
      type: row.type,
      status: row.status,
      blockNumber: row.block_number,
      transactionHash: row.transaction_hash,
      timestamp: row.timestamp,
      data: typeof row.data === 'string' ? JSON.parse(row.data) : row.data,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}
