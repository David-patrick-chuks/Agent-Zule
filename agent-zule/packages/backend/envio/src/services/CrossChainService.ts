import { Database } from '@envio/database';
import { Logger } from '../../utils/Logger';

interface CrossChainEvent {
  id: string;
  userId: string;
  sourceChain: string;
  targetChain: string;
  status: string;
  blockNumber: number;
  transactionHash: string;
  timestamp: number;
  data: {
    token: string;
    amount: string;
    bridge: string;
    fees: string;
    estimatedTime: number;
    sourceTxHash: string;
    targetTxHash?: string;
    completedAt?: string;
    reason?: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface CrossChainStats {
  totalBridges: number;
  completedBridges: number;
  failedBridges: number;
  totalVolume: string;
  totalFees: string;
  averageTime: number;
  successRate: number;
  byChain: Array<{
    chain: string;
    count: number;
    volume: string;
    successRate: number;
  }>;
  byBridge: Array<{
    bridge: string;
    count: number;
    volume: string;
    successRate: number;
    averageTime: number;
  }>;
}

export class CrossChainService {
  private static db = new Database();
  private static logger = Logger.getInstance();

  // Get cross-chain data
  static async getCrossChain(crossChainId: string): Promise<CrossChainEvent | null> {
    try {
      const result = await this.db.query(`
        SELECT * FROM cross_chain_events 
        WHERE id = $1
      `, [crossChainId]);

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToCrossChainEvent(result.rows[0]);
    } catch (error) {
      this.logger.error('Error getting cross-chain:', error);
      throw error;
    }
  }

  // Create cross-chain event
  static async createCrossChainEvent(eventData: {
    userId: string;
    sourceChain: string;
    targetChain: string;
    status: string;
    blockNumber: number;
    transactionHash: string;
    timestamp: number;
    data: any;
  }): Promise<CrossChainEvent> {
    try {
      const result = await this.db.query(`
        INSERT INTO cross_chain_events (
          user_id, source_chain, target_chain, status, block_number, 
          transaction_hash, timestamp, data, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
        RETURNING *
      `, [
        eventData.userId,
        eventData.sourceChain,
        eventData.targetChain,
        eventData.status,
        eventData.blockNumber,
        eventData.transactionHash,
        eventData.timestamp,
        JSON.stringify(eventData.data)
      ]);

      const crossChainEvent = this.mapRowToCrossChainEvent(result.rows[0]);
      this.logger.info(`Cross-chain event created: ${eventData.status} for user ${eventData.userId}`);
      return crossChainEvent;
    } catch (error) {
      this.logger.error('Error creating cross-chain event:', error);
      throw error;
    }
  }

  // Update cross-chain
  static async updateCrossChain(crossChainId: string, crossChainData: any): Promise<CrossChainEvent> {
    try {
      const result = await this.db.query(`
        UPDATE cross_chain_events 
        SET data = $1, status = $2, updated_at = NOW()
        WHERE id = $3
        RETURNING *
      `, [
        JSON.stringify(crossChainData.data),
        crossChainData.status,
        crossChainId
      ]);

      if (result.rows.length === 0) {
        throw new Error(`Cross-chain not found: ${crossChainId}`);
      }

      const crossChainEvent = this.mapRowToCrossChainEvent(result.rows[0]);
      this.logger.info(`Cross-chain updated: ${crossChainId}`);
      return crossChainEvent;
    } catch (error) {
      this.logger.error('Error updating cross-chain:', error);
      throw error;
    }
  }

  // Delete cross-chain
  static async deleteCrossChain(crossChainId: string): Promise<void> {
    try {
      await this.db.query(`
        DELETE FROM cross_chain_events WHERE id = $1
      `, [crossChainId]);

      this.logger.info(`Cross-chain deleted: ${crossChainId}`);
    } catch (error) {
      this.logger.error('Error deleting cross-chain:', error);
      throw error;
    }
  }

  // Get cross-chain metrics
  static async getCrossChainMetrics(): Promise<CrossChainStats> {
    try {
      const result = await this.db.query(`
        SELECT 
          COUNT(*) as total_bridges,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_bridges,
          COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_bridges,
          SUM(CAST(data->>'amount' AS NUMERIC)) as total_volume,
          SUM(CAST(data->>'fees' AS NUMERIC)) as total_fees,
          AVG(CAST(data->>'estimatedTime' AS NUMERIC)) as average_time
        FROM cross_chain_events 
        WHERE timestamp > EXTRACT(EPOCH FROM NOW() - INTERVAL '30 days')
      `);

      const metrics = result.rows[0];
      const total = parseInt(metrics.total_bridges);
      const completed = parseInt(metrics.completed_bridges);

      return {
        totalBridges: total,
        completedBridges: completed,
        failedBridges: parseInt(metrics.failed_bridges),
        totalVolume: metrics.total_volume?.toString() || "0",
        totalFees: metrics.total_fees?.toString() || "0",
        averageTime: parseFloat(metrics.average_time) || 0,
        successRate: total > 0 ? (completed / total) * 100 : 0,
        byChain: await this.getCrossChainStatsByChain(),
        byBridge: await this.getCrossChainStatsByBridge()
      };
    } catch (error) {
      this.logger.error('Error getting cross-chain metrics:', error);
      throw error;
    }
  }

  // Update cross-chain metrics
  static async updateCrossChainMetrics(metrics: any): Promise<void> {
    try {
      await this.db.query(`
        INSERT INTO cross_chain_metrics (
          total_bridges, completed_bridges, failed_bridges,
          total_volume, total_fees, success_rate, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
        ON CONFLICT (id) 
        DO UPDATE SET 
          total_bridges = EXCLUDED.total_bridges,
          completed_bridges = EXCLUDED.completed_bridges,
          failed_bridges = EXCLUDED.failed_bridges,
          total_volume = EXCLUDED.total_volume,
          total_fees = EXCLUDED.total_fees,
          success_rate = EXCLUDED.success_rate,
          updated_at = NOW()
      `, [
        metrics.totalBridges || 0,
        metrics.completedBridges || 0,
        metrics.failedBridges || 0,
        metrics.totalVolume || "0",
        metrics.totalFees || "0",
        metrics.successRate || 0
      ]);

      this.logger.info('Cross-chain metrics updated');
    } catch (error) {
      this.logger.error('Error updating cross-chain metrics:', error);
      throw error;
    }
  }

  // Get cross-chain stats by chain
  private static async getCrossChainStatsByChain(): Promise<Array<{chain: string, count: number, volume: string, successRate: number}>> {
    try {
      const result = await this.db.query(`
        SELECT 
          source_chain as chain,
          COUNT(*) as count,
          SUM(CAST(data->>'amount' AS NUMERIC)) as volume,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as successful
        FROM cross_chain_events 
        WHERE timestamp > EXTRACT(EPOCH FROM NOW() - INTERVAL '30 days')
        GROUP BY source_chain
      `);

      return result.rows.map(row => ({
        chain: row.chain,
        count: parseInt(row.count),
        volume: row.volume?.toString() || "0",
        successRate: parseInt(row.count) > 0 ? (parseInt(row.successful) / parseInt(row.count)) * 100 : 0
      }));
    } catch (error) {
      this.logger.error('Error getting cross-chain stats by chain:', error);
      return [];
    }
  }

  // Get cross-chain stats by bridge
  private static async getCrossChainStatsByBridge(): Promise<Array<{bridge: string, count: number, volume: string, successRate: number, averageTime: number}>> {
    try {
      const result = await this.db.query(`
        SELECT 
          data->>'bridge' as bridge,
          COUNT(*) as count,
          SUM(CAST(data->>'amount' AS NUMERIC)) as volume,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as successful,
          AVG(CAST(data->>'estimatedTime' AS NUMERIC)) as average_time
        FROM cross_chain_events 
        WHERE timestamp > EXTRACT(EPOCH FROM NOW() - INTERVAL '30 days')
        GROUP BY data->>'bridge'
      `);

      return result.rows.map(row => ({
        bridge: row.bridge,
        count: parseInt(row.count),
        volume: row.volume?.toString() || "0",
        successRate: parseInt(row.count) > 0 ? (parseInt(row.successful) / parseInt(row.count)) * 100 : 0,
        averageTime: parseFloat(row.average_time) || 0
      }));
    } catch (error) {
      this.logger.error('Error getting cross-chain stats by bridge:', error);
      return [];
    }
  }

  // Helper method to map database row to CrossChainEvent
  private static mapRowToCrossChainEvent(row: any): CrossChainEvent {
    return {
      id: row.id,
      userId: row.user_id,
      sourceChain: row.source_chain,
      targetChain: row.target_chain,
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
