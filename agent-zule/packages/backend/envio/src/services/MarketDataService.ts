import { Database } from '@envio/database';
import { Logger } from '../../utils/Logger';

interface MarketData {
  id: string;
  timestamp: string;
  totalMarketCap: string;
  totalVolume24h: string;
  marketTrend: string;
  volatility: number;
  fearGreedIndex: number;
  topGainers: Array<{
    token: string;
    symbol: string;
    priceChange: string;
    priceChangePercent: number;
  }>;
  topLosers: Array<{
    token: string;
    symbol: string;
    priceChange: string;
    priceChangePercent: number;
  }>;
  createdAt: string;
  updatedAt: string;
}

interface PricePoint {
  timestamp: string;
  price: string;
  volume: string;
  marketCap: string;
}

interface TokenChange {
  token: string;
  symbol: string;
  priceChange: string;
  priceChangePercent: number;
}

export class MarketDataService {
  private static db = new Database();
  private static logger = Logger.getInstance();

  // Get market data
  static async getMarketData(): Promise<MarketData | null> {
    try {
      const result = await this.db.query(`
        SELECT * FROM market_data 
        ORDER BY timestamp DESC 
        LIMIT 1
      `);

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToMarketData(result.rows[0]);
    } catch (error) {
      this.logger.error('Error getting market data:', error);
      throw error;
    }
  }

  // Create market data
  static async createMarketData(marketData: {
    timestamp: string;
    totalMarketCap: string;
    totalVolume24h: string;
    marketTrend: string;
    volatility: number;
    fearGreedIndex: number;
    topGainers: TokenChange[];
    topLosers: TokenChange[];
  }): Promise<MarketData> {
    try {
      const result = await this.db.query(`
        INSERT INTO market_data (
          timestamp, total_market_cap, total_volume_24h, market_trend,
          volatility, fear_greed_index, top_gainers, top_losers,
          created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
        RETURNING *
      `, [
        marketData.timestamp,
        marketData.totalMarketCap,
        marketData.totalVolume24h,
        marketData.marketTrend,
        marketData.volatility,
        marketData.fearGreedIndex,
        JSON.stringify(marketData.topGainers),
        JSON.stringify(marketData.topLosers)
      ]);

      const marketDataResult = this.mapRowToMarketData(result.rows[0]);
      this.logger.info('Market data created');
      return marketDataResult;
    } catch (error) {
      this.logger.error('Error creating market data:', error);
      throw error;
    }
  }

  // Update market data
  static async updateMarketData(marketDataId: string, marketData: any): Promise<MarketData> {
    try {
      const result = await this.db.query(`
        UPDATE market_data 
        SET 
          total_market_cap = $1,
          total_volume_24h = $2,
          market_trend = $3,
          volatility = $4,
          fear_greed_index = $5,
          top_gainers = $6,
          top_losers = $7,
          updated_at = NOW()
        WHERE id = $8
        RETURNING *
      `, [
        marketData.totalMarketCap,
        marketData.totalVolume24h,
        marketData.marketTrend,
        marketData.volatility,
        marketData.fearGreedIndex,
        JSON.stringify(marketData.topGainers),
        JSON.stringify(marketData.topLosers),
        marketDataId
      ]);

      if (result.rows.length === 0) {
        throw new Error(`Market data not found: ${marketDataId}`);
      }

      const marketDataResult = this.mapRowToMarketData(result.rows[0]);
      this.logger.info(`Market data updated: ${marketDataId}`);
      return marketDataResult;
    } catch (error) {
      this.logger.error('Error updating market data:', error);
      throw error;
    }
  }

  // Delete market data
  static async deleteMarketData(marketDataId: string): Promise<void> {
    try {
      await this.db.query(`
        DELETE FROM market_data WHERE id = $1
      `, [marketDataId]);

      this.logger.info(`Market data deleted: ${marketDataId}`);
    } catch (error) {
      this.logger.error('Error deleting market data:', error);
      throw error;
    }
  }

  // Get price history
  static async getPriceHistory(token: string, timeframe: string = '1d', limit: number = 100): Promise<PricePoint[]> {
    try {
      const result = await this.db.query(`
        SELECT timestamp, price, volume, market_cap 
        FROM price_history 
        WHERE token = $1 
        AND timestamp > NOW() - INTERVAL '${timeframe}'
        ORDER BY timestamp DESC 
        LIMIT $2
      `, [token, limit]);

      return result.rows.map(row => ({
        timestamp: row.timestamp,
        price: row.price,
        volume: row.volume,
        marketCap: row.market_cap
      }));
    } catch (error) {
      this.logger.error('Error getting price history:', error);
      throw error;
    }
  }

  // Get market data metrics
  static async getMarketDataMetrics(): Promise<{
    totalMarketCap: string;
    totalVolume24h: string;
    averageVolatility: number;
    averageFearGreedIndex: number;
    trendDistribution: {
      bullish: number;
      bearish: number;
      neutral: number;
    };
  }> {
    try {
      const result = await this.db.query(`
        SELECT 
          AVG(CAST(total_market_cap AS NUMERIC)) as avg_market_cap,
          AVG(CAST(total_volume_24h AS NUMERIC)) as avg_volume_24h,
          AVG(volatility) as avg_volatility,
          AVG(fear_greed_index) as avg_fear_greed_index,
          COUNT(CASE WHEN market_trend = 'bullish' THEN 1 END) as bullish_count,
          COUNT(CASE WHEN market_trend = 'bearish' THEN 1 END) as bearish_count,
          COUNT(CASE WHEN market_trend = 'neutral' THEN 1 END) as neutral_count,
          COUNT(*) as total_count
        FROM market_data 
        WHERE timestamp > NOW() - INTERVAL '7 days'
      `);

      const metrics = result.rows[0];
      const total = parseInt(metrics.total_count);

      return {
        totalMarketCap: metrics.avg_market_cap?.toString() || "0",
        totalVolume24h: metrics.avg_volume_24h?.toString() || "0",
        averageVolatility: parseFloat(metrics.avg_volatility) || 0,
        averageFearGreedIndex: parseFloat(metrics.avg_fear_greed_index) || 0,
        trendDistribution: {
          bullish: total > 0 ? (parseInt(metrics.bullish_count) / total) * 100 : 0,
          bearish: total > 0 ? (parseInt(metrics.bearish_count) / total) * 100 : 0,
          neutral: total > 0 ? (parseInt(metrics.neutral_count) / total) * 100 : 0
        }
      };
    } catch (error) {
      this.logger.error('Error getting market data metrics:', error);
      throw error;
    }
  }

  // Update market data metrics
  static async updateMarketDataMetrics(metrics: any): Promise<void> {
    try {
      await this.db.query(`
        INSERT INTO market_data_metrics (
          total_market_cap, total_volume_24h, average_volatility,
          average_fear_greed_index, trend_distribution, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
        ON CONFLICT (id) 
        DO UPDATE SET 
          total_market_cap = EXCLUDED.total_market_cap,
          total_volume_24h = EXCLUDED.total_volume_24h,
          average_volatility = EXCLUDED.average_volatility,
          average_fear_greed_index = EXCLUDED.average_fear_greed_index,
          trend_distribution = EXCLUDED.trend_distribution,
          updated_at = NOW()
      `, [
        metrics.totalMarketCap || "0",
        metrics.totalVolume24h || "0",
        metrics.averageVolatility || 0,
        metrics.averageFearGreedIndex || 0,
        JSON.stringify(metrics.trendDistribution)
      ]);

      this.logger.info('Market data metrics updated');
    } catch (error) {
      this.logger.error('Error updating market data metrics:', error);
      throw error;
    }
  }

  // Helper method to map database row to MarketData
  private static mapRowToMarketData(row: any): MarketData {
    return {
      id: row.id,
      timestamp: row.timestamp,
      totalMarketCap: row.total_market_cap,
      totalVolume24h: row.total_volume_24h,
      marketTrend: row.market_trend,
      volatility: row.volatility,
      fearGreedIndex: row.fear_greed_index,
      topGainers: typeof row.top_gainers === 'string' ? JSON.parse(row.top_gainers) : row.top_gainers,
      topLosers: typeof row.top_losers === 'string' ? JSON.parse(row.top_losers) : row.top_losers,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}
