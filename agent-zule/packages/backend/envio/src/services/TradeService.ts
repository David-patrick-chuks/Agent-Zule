import { Database } from '@envio/database';
import { Logger } from '../../utils/Logger';

interface TradeEvent {
  id: string;
  userId: string;
  type: string;
  status: string;
  blockNumber: number;
  transactionHash: string;
  timestamp: number;
  data: {
    tokenIn: string;
    tokenOut: string;
    amountIn: string;
    amountOut: string;
    price: string;
    slippage: number;
    gasUsed: string;
    gasPrice: string;
    fee: string;
    route: string[];
    dex: string;
    reason?: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface TradeStats {
  totalTrades: number;
  completedTrades: number;
  failedTrades: number;
  totalVolume: string;
  totalFees: string;
  averageGasUsed: number;
  successRate: number;
  byType: Array<{
    type: string;
    count: number;
    volume: string;
    successRate: number;
  }>;
  byToken: Array<{
    token: string;
    volume: string;
    count: number;
    averagePrice: string;
  }>;
}

export class TradeService {
  private static db = new Database();
  private static logger = Logger.getInstance();

  // Get trade data
  static async getTrade(tradeId: string): Promise<TradeEvent | null> {
    try {
      const result = await this.db.query(`
        SELECT * FROM trade_events 
        WHERE id = $1
      `, [tradeId]);

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToTradeEvent(result.rows[0]);
    } catch (error) {
      this.logger.error('Error getting trade:', error);
      throw error;
    }
  }

  // Create trade event
  static async createTradeEvent(eventData: {
    userId: string;
    type: string;
    status: string;
    blockNumber: number;
    transactionHash: string;
    timestamp: number;
    data: any;
  }): Promise<TradeEvent> {
    try {
      const result = await this.db.query(`
        INSERT INTO trade_events (
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

      const tradeEvent = this.mapRowToTradeEvent(result.rows[0]);
      this.logger.info(`Trade event created: ${eventData.type} for user ${eventData.userId}`);
      return tradeEvent;
    } catch (error) {
      this.logger.error('Error creating trade event:', error);
      throw error;
    }
  }

  // Update trade
  static async updateTrade(tradeId: string, tradeData: any): Promise<TradeEvent> {
    try {
      const result = await this.db.query(`
        UPDATE trade_events 
        SET data = $1, status = $2, updated_at = NOW()
        WHERE id = $3
        RETURNING *
      `, [
        JSON.stringify(tradeData.data),
        tradeData.status,
        tradeId
      ]);

      if (result.rows.length === 0) {
        throw new Error(`Trade not found: ${tradeId}`);
      }

      const tradeEvent = this.mapRowToTradeEvent(result.rows[0]);
      this.logger.info(`Trade updated: ${tradeId}`);
      return tradeEvent;
    } catch (error) {
      this.logger.error('Error updating trade:', error);
      throw error;
    }
  }

  // Delete trade
  static async deleteTrade(tradeId: string): Promise<void> {
    try {
      await this.db.query(`
        DELETE FROM trade_events WHERE id = $1
      `, [tradeId]);

      this.logger.info(`Trade deleted: ${tradeId}`);
    } catch (error) {
      this.logger.error('Error deleting trade:', error);
      throw error;
    }
  }

  // Get trade metrics
  static async getTradeMetrics(userId?: string): Promise<TradeStats> {
    try {
      const whereClause = userId ? 'WHERE user_id = $1' : '';
      const params = userId ? [userId] : [];

      const result = await this.db.query(`
        SELECT 
          COUNT(*) as total_trades,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_trades,
          COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_trades,
          SUM(CAST(data->>'amountIn' AS NUMERIC)) as total_volume,
          SUM(CAST(data->>'fee' AS NUMERIC)) as total_fees,
          AVG(CAST(data->>'gasUsed' AS NUMERIC)) as average_gas_used
        FROM trade_events 
        ${whereClause}
        AND timestamp > EXTRACT(EPOCH FROM NOW() - INTERVAL '30 days')
      `, params);

      const metrics = result.rows[0];
      const total = parseInt(metrics.total_trades);
      const completed = parseInt(metrics.completed_trades);

      return {
        totalTrades: total,
        completedTrades: completed,
        failedTrades: parseInt(metrics.failed_trades),
        totalVolume: metrics.total_volume?.toString() || "0",
        totalFees: metrics.total_fees?.toString() || "0",
        averageGasUsed: parseFloat(metrics.average_gas_used) || 0,
        successRate: total > 0 ? (completed / total) * 100 : 0,
        byType: await this.getTradeStatsByType(userId),
        byToken: await this.getTradeStatsByToken(userId)
      };
    } catch (error) {
      this.logger.error('Error getting trade metrics:', error);
      throw error;
    }
  }

  // Update trade metrics
  static async updateTradeMetrics(userId: string, metrics: any): Promise<void> {
    try {
      await this.db.query(`
        INSERT INTO trade_metrics (
          user_id, total_trades, completed_trades, failed_trades,
          total_volume, total_fees, success_rate, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
        ON CONFLICT (user_id) 
        DO UPDATE SET 
          total_trades = EXCLUDED.total_trades,
          completed_trades = EXCLUDED.completed_trades,
          failed_trades = EXCLUDED.failed_trades,
          total_volume = EXCLUDED.total_volume,
          total_fees = EXCLUDED.total_fees,
          success_rate = EXCLUDED.success_rate,
          updated_at = NOW()
      `, [
        userId,
        metrics.totalTrades || 0,
        metrics.completedTrades || 0,
        metrics.failedTrades || 0,
        metrics.totalVolume || "0",
        metrics.totalFees || "0",
        metrics.successRate || 0
      ]);

      this.logger.info(`Trade metrics updated for user ${userId}`);
    } catch (error) {
      this.logger.error('Error updating trade metrics:', error);
      throw error;
    }
  }

  // Get trade stats by type
  private static async getTradeStatsByType(userId?: string): Promise<Array<{type: string, count: number, volume: string, successRate: number}>> {
    try {
      const whereClause = userId ? 'WHERE user_id = $1' : '';
      const params = userId ? [userId] : [];

      const result = await this.db.query(`
        SELECT 
          type,
          COUNT(*) as count,
          SUM(CAST(data->>'amountIn' AS NUMERIC)) as volume,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as successful
        FROM trade_events 
        ${whereClause}
        AND timestamp > EXTRACT(EPOCH FROM NOW() - INTERVAL '30 days')
        GROUP BY type
      `, params);

      return result.rows.map(row => ({
        type: row.type,
        count: parseInt(row.count),
        volume: row.volume?.toString() || "0",
        successRate: parseInt(row.count) > 0 ? (parseInt(row.successful) / parseInt(row.count)) * 100 : 0
      }));
    } catch (error) {
      this.logger.error('Error getting trade stats by type:', error);
      return [];
    }
  }

  // Get trade stats by token
  private static async getTradeStatsByToken(userId?: string): Promise<Array<{token: string, volume: string, count: number, averagePrice: string}>> {
    try {
      const whereClause = userId ? 'WHERE user_id = $1' : '';
      const params = userId ? [userId] : [];

      const result = await this.db.query(`
        SELECT 
          data->>'tokenIn' as token,
          SUM(CAST(data->>'amountIn' AS NUMERIC)) as volume,
          COUNT(*) as count,
          AVG(CAST(data->>'price' AS NUMERIC)) as average_price
        FROM trade_events 
        ${whereClause}
        AND timestamp > EXTRACT(EPOCH FROM NOW() - INTERVAL '30 days')
        GROUP BY data->>'tokenIn'
      `, params);

      return result.rows.map(row => ({
        token: row.token,
        volume: row.volume?.toString() || "0",
        count: parseInt(row.count),
        averagePrice: row.average_price?.toString() || "0"
      }));
    } catch (error) {
      this.logger.error('Error getting trade stats by token:', error);
      return [];
    }
  }

  // Helper method to map database row to TradeEvent
  private static mapRowToTradeEvent(row: any): TradeEvent {
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
