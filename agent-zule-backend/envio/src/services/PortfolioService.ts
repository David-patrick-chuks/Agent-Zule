import { Database } from '@envio/database';
import { Logger } from '../../utils/Logger';

interface PortfolioEvent {
  id: string;
  userId: string;
  eventType: string;
  blockNumber: number;
  transactionHash: string;
  timestamp: number;
  data: {
    totalValue: string;
    positions: Array<{
      token: string;
      amount: string;
      value: string;
      allocation: number;
    }>;
    riskScore: number;
    lastRebalanced: string;
    changes?: Array<{
      token: string;
      oldAmount: string;
      newAmount: string;
      change: string;
      changePercentage: number;
    }>;
  };
  createdAt: string;
  updatedAt: string;
}

interface PortfolioMetrics {
  totalValue: string;
  totalPnl: string;
  totalPnlPercentage: number;
  dailyPnl: string;
  dailyPnlPercentage: number;
  volatility: number;
  sharpeRatio: number;
  maxDrawdown: number;
  beta: number;
  alpha: number;
  diversificationScore: number;
  concentrationRisk: number;
}

export class PortfolioService {
  private static db = new Database();
  private static logger = Logger.getInstance();

  // Get portfolio data
  static async getPortfolio(userId: string): Promise<PortfolioEvent | null> {
    try {
      const portfolio = await this.db.query(`
        SELECT * FROM portfolio_events 
        WHERE user_id = $1 
        ORDER BY timestamp DESC 
        LIMIT 1
      `, [userId]);

      if (portfolio.rows.length === 0) {
        return null;
      }

      return this.mapRowToPortfolioEvent(portfolio.rows[0]);
    } catch (error) {
      this.logger.error('Error getting portfolio:', error);
      throw error;
    }
  }

  // Create portfolio event
  static async createPortfolioEvent(eventData: {
    userId: string;
    eventType: string;
    blockNumber: number;
    transactionHash: string;
    timestamp: number;
    data: any;
  }): Promise<PortfolioEvent> {
    try {
      const result = await this.db.query(`
        INSERT INTO portfolio_events (
          user_id, event_type, block_number, transaction_hash, 
          timestamp, data, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
        RETURNING *
      `, [
        eventData.userId,
        eventData.eventType,
        eventData.blockNumber,
        eventData.transactionHash,
        eventData.timestamp,
        JSON.stringify(eventData.data)
      ]);

      const portfolioEvent = this.mapRowToPortfolioEvent(result.rows[0]);
      this.logger.info(`Portfolio event created: ${eventData.eventType} for user ${eventData.userId}`);
      return portfolioEvent;
    } catch (error) {
      this.logger.error('Error creating portfolio event:', error);
      throw error;
    }
  }

  // Update portfolio
  static async updatePortfolio(userId: string, portfolioData: any): Promise<PortfolioEvent> {
    try {
      const result = await this.db.query(`
        UPDATE portfolio_events 
        SET data = $1, updated_at = NOW()
        WHERE user_id = $2 
        ORDER BY timestamp DESC 
        LIMIT 1
        RETURNING *
      `, [JSON.stringify(portfolioData), userId]);

      if (result.rows.length === 0) {
        throw new Error(`Portfolio not found for user ${userId}`);
      }

      const portfolioEvent = this.mapRowToPortfolioEvent(result.rows[0]);
      this.logger.info(`Portfolio updated for user ${userId}`);
      return portfolioEvent;
    } catch (error) {
      this.logger.error('Error updating portfolio:', error);
      throw error;
    }
  }

  // Delete portfolio
  static async deletePortfolio(userId: string): Promise<void> {
    try {
      await this.db.query(`
        DELETE FROM portfolio_events WHERE user_id = $1
      `, [userId]);

      this.logger.info(`Portfolio deleted for user ${userId}`);
    } catch (error) {
      this.logger.error('Error deleting portfolio:', error);
      throw error;
    }
  }

  // Get portfolio metrics
  static async getPortfolioMetrics(userId: string): Promise<PortfolioMetrics> {
    try {
      const result = await this.db.query(`
        SELECT 
          AVG(CAST(data->>'totalValue' AS NUMERIC)) as total_value,
          COUNT(*) as total_events,
          MAX(CAST(data->>'riskScore' AS NUMERIC)) as max_risk_score,
          MIN(CAST(data->>'riskScore' AS NUMERIC)) as min_risk_score
        FROM portfolio_events 
        WHERE user_id = $1 
        AND timestamp > EXTRACT(EPOCH FROM NOW() - INTERVAL '30 days')
      `, [userId]);

      const metrics = result.rows[0];
      return {
        totalValue: metrics.total_value?.toString() || "0",
        totalPnl: "0", // Calculate from historical data
        totalPnlPercentage: 0,
        dailyPnl: "0",
        dailyPnlPercentage: 0,
        volatility: this.calculateVolatility(metrics),
        sharpeRatio: 0,
        maxDrawdown: 0,
        beta: 0,
        alpha: 0,
        diversificationScore: this.calculateDiversificationScore(metrics),
        concentrationRisk: this.calculateConcentrationRisk(metrics)
      };
    } catch (error) {
      this.logger.error('Error getting portfolio metrics:', error);
      throw error;
    }
  }

  // Update portfolio metrics
  static async updatePortfolioMetrics(userId: string, metrics: any): Promise<void> {
    try {
      await this.db.query(`
        INSERT INTO portfolio_metrics (
          user_id, total_value, total_pnl, volatility, 
          diversification_score, concentration_risk, 
          created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
        ON CONFLICT (user_id) 
        DO UPDATE SET 
          total_value = EXCLUDED.total_value,
          total_pnl = EXCLUDED.total_pnl,
          volatility = EXCLUDED.volatility,
          diversification_score = EXCLUDED.diversification_score,
          concentration_risk = EXCLUDED.concentration_risk,
          updated_at = NOW()
      `, [
        userId,
        metrics.totalValue,
        metrics.totalPnl || "0",
        metrics.volatility || 0,
        metrics.diversificationScore || 0,
        metrics.concentrationRisk || 0
      ]);

      this.logger.info(`Portfolio metrics updated for user ${userId}`);
    } catch (error) {
      this.logger.error('Error updating portfolio metrics:', error);
      throw error;
    }
  }

  // Archive portfolio metrics
  static async archivePortfolioMetrics(userId: string): Promise<void> {
    try {
      await this.db.query(`
        UPDATE portfolio_metrics 
        SET archived = true, updated_at = NOW()
        WHERE user_id = $1
      `, [userId]);

      this.logger.info(`Portfolio metrics archived for user ${userId}`);
    } catch (error) {
      this.logger.error('Error archiving portfolio metrics:', error);
      throw error;
    }
  }

  // Helper method to map database row to PortfolioEvent
  private static mapRowToPortfolioEvent(row: any): PortfolioEvent {
    return {
      id: row.id,
      userId: row.user_id,
      eventType: row.event_type,
      blockNumber: row.block_number,
      transactionHash: row.transaction_hash,
      timestamp: row.timestamp,
      data: typeof row.data === 'string' ? JSON.parse(row.data) : row.data,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  // Calculate volatility from metrics
  private static calculateVolatility(metrics: any): number {
    // Simple volatility calculation based on risk score variance
    return metrics.max_risk_score - metrics.min_risk_score;
  }

  // Calculate diversification score
  private static calculateDiversificationScore(metrics: any): number {
    // Higher event count suggests more diversification
    return Math.min(metrics.total_events / 10, 1) * 100;
  }

  // Calculate concentration risk
  private static calculateConcentrationRisk(metrics: any): number {
    // Higher risk score suggests higher concentration
    return metrics.max_risk_score * 100;
  }
}
