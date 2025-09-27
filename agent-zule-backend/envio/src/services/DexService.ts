import { Database } from '@envio/database';
import { Logger } from '../../utils/Logger';

interface DexEvent {
  id: string;
  poolAddress: string;
  eventType: string;
  blockNumber: number;
  transactionHash: string;
  timestamp: number;
  data: {
    token0: string;
    token1: string;
    reserve0: string;
    reserve1: string;
    liquidity: string;
    fee: number;
    tick: number;
    sqrtPriceX96: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface LiquidityPool {
  address: string;
  token0: string;
  token1: string;
  reserve0: string;
  reserve1: string;
  liquidity: string;
  fee: number;
  tick: number;
  sqrtPriceX96: string;
  volume24h: string;
  fees24h: string;
  apy: number;
  createdAt: string;
  updatedAt: string;
}

export class DexService {
  private static db = new Database();
  private static logger = Logger.getInstance();

  // Get DEX data
  static async getDex(dexId: string): Promise<DexEvent | null> {
    try {
      const result = await this.db.query(`
        SELECT * FROM dex_events 
        WHERE id = $1
      `, [dexId]);

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToDexEvent(result.rows[0]);
    } catch (error) {
      this.logger.error('Error getting DEX:', error);
      throw error;
    }
  }

  // Create DEX event
  static async createDexEvent(eventData: {
    poolAddress: string;
    eventType: string;
    blockNumber: number;
    transactionHash: string;
    timestamp: number;
    data: any;
  }): Promise<DexEvent> {
    try {
      const result = await this.db.query(`
        INSERT INTO dex_events (
          pool_address, event_type, block_number, transaction_hash, 
          timestamp, data, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
        RETURNING *
      `, [
        eventData.poolAddress,
        eventData.eventType,
        eventData.blockNumber,
        eventData.transactionHash,
        eventData.timestamp,
        JSON.stringify(eventData.data)
      ]);

      const dexEvent = this.mapRowToDexEvent(result.rows[0]);
      this.logger.info(`DEX event created: ${eventData.eventType} for pool ${eventData.poolAddress}`);
      return dexEvent;
    } catch (error) {
      this.logger.error('Error creating DEX event:', error);
      throw error;
    }
  }

  // Update DEX
  static async updateDex(dexId: string, dexData: any): Promise<DexEvent> {
    try {
      const result = await this.db.query(`
        UPDATE dex_events 
        SET data = $1, updated_at = NOW()
        WHERE id = $2
        RETURNING *
      `, [
        JSON.stringify(dexData.data),
        dexId
      ]);

      if (result.rows.length === 0) {
        throw new Error(`DEX not found: ${dexId}`);
      }

      const dexEvent = this.mapRowToDexEvent(result.rows[0]);
      this.logger.info(`DEX updated: ${dexId}`);
      return dexEvent;
    } catch (error) {
      this.logger.error('Error updating DEX:', error);
      throw error;
    }
  }

  // Delete DEX
  static async deleteDex(dexId: string): Promise<void> {
    try {
      await this.db.query(`
        DELETE FROM dex_events WHERE id = $1
      `, [dexId]);

      this.logger.info(`DEX deleted: ${dexId}`);
    } catch (error) {
      this.logger.error('Error deleting DEX:', error);
      throw error;
    }
  }

  // Get liquidity pools
  static async getLiquidityPools(filters?: {
    token0?: string;
    token1?: string;
    minLiquidity?: string;
    limit?: number;
    offset?: number;
  }): Promise<LiquidityPool[]> {
    try {
      let whereClause = 'WHERE 1=1';
      const params: any[] = [];
      let paramIndex = 1;

      if (filters?.token0) {
        whereClause += ` AND token0 = $${paramIndex}`;
        params.push(filters.token0);
        paramIndex++;
      }

      if (filters?.token1) {
        whereClause += ` AND token1 = $${paramIndex}`;
        params.push(filters.token1);
        paramIndex++;
      }

      if (filters?.minLiquidity) {
        whereClause += ` AND CAST(liquidity AS NUMERIC) >= $${paramIndex}`;
        params.push(filters.minLiquidity);
        paramIndex++;
      }

      const limit = filters?.limit || 100;
      const offset = filters?.offset || 0;

      const result = await this.db.query(`
        SELECT * FROM liquidity_pools 
        ${whereClause}
        ORDER BY liquidity DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `, [...params, limit, offset]);

      return result.rows.map(row => this.mapRowToLiquidityPool(row));
    } catch (error) {
      this.logger.error('Error getting liquidity pools:', error);
      throw error;
    }
  }

  // Get DEX metrics
  static async getDexMetrics(): Promise<{
    totalPools: number;
    totalLiquidity: string;
    totalVolume24h: string;
    totalFees24h: string;
    averageAPY: number;
  }> {
    try {
      const result = await this.db.query(`
        SELECT 
          COUNT(*) as total_pools,
          SUM(CAST(liquidity AS NUMERIC)) as total_liquidity,
          SUM(CAST(volume_24h AS NUMERIC)) as total_volume_24h,
          SUM(CAST(fees_24h AS NUMERIC)) as total_fees_24h,
          AVG(apy) as average_apy
        FROM liquidity_pools 
        WHERE updated_at > NOW() - INTERVAL '24 hours'
      `);

      const metrics = result.rows[0];
      return {
        totalPools: parseInt(metrics.total_pools) || 0,
        totalLiquidity: metrics.total_liquidity?.toString() || "0",
        totalVolume24h: metrics.total_volume_24h?.toString() || "0",
        totalFees24h: metrics.total_fees_24h?.toString() || "0",
        averageAPY: parseFloat(metrics.average_apy) || 0
      };
    } catch (error) {
      this.logger.error('Error getting DEX metrics:', error);
      throw error;
    }
  }

  // Update DEX metrics
  static async updateDexMetrics(metrics: any): Promise<void> {
    try {
      await this.db.query(`
        INSERT INTO dex_metrics (
          total_pools, total_liquidity, total_volume_24h, 
          total_fees_24h, average_apy, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
        ON CONFLICT (id) 
        DO UPDATE SET 
          total_pools = EXCLUDED.total_pools,
          total_liquidity = EXCLUDED.total_liquidity,
          total_volume_24h = EXCLUDED.total_volume_24h,
          total_fees_24h = EXCLUDED.total_fees_24h,
          average_apy = EXCLUDED.average_apy,
          updated_at = NOW()
      `, [
        metrics.totalPools || 0,
        metrics.totalLiquidity || "0",
        metrics.totalVolume24h || "0",
        metrics.totalFees24h || "0",
        metrics.averageAPY || 0
      ]);

      this.logger.info('DEX metrics updated');
    } catch (error) {
      this.logger.error('Error updating DEX metrics:', error);
      throw error;
    }
  }

  // Helper method to map database row to DexEvent
  private static mapRowToDexEvent(row: any): DexEvent {
    return {
      id: row.id,
      poolAddress: row.pool_address,
      eventType: row.event_type,
      blockNumber: row.block_number,
      transactionHash: row.transaction_hash,
      timestamp: row.timestamp,
      data: typeof row.data === 'string' ? JSON.parse(row.data) : row.data,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  // Helper method to map database row to LiquidityPool
  private static mapRowToLiquidityPool(row: any): LiquidityPool {
    return {
      address: row.address,
      token0: row.token0,
      token1: row.token1,
      reserve0: row.reserve0,
      reserve1: row.reserve1,
      liquidity: row.liquidity,
      fee: row.fee,
      tick: row.tick,
      sqrtPriceX96: row.sqrt_price_x96,
      volume24h: row.volume_24h,
      fees24h: row.fees_24h,
      apy: row.apy,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}
