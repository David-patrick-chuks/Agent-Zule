import { Database } from '@envio/database';
import { Logger } from '../../utils/Logger';

interface IndexerStats {
  id: string;
  totalEvents: number;
  eventsPerSecond: number;
  averageProcessingTime: number;
  errorRate: number;
  uptime: string;
  memoryUsage: string;
  cpuUsage: number;
  createdAt: string;
  updatedAt: string;
}

interface StatsMetrics {
  totalEvents: number;
  eventsPerSecond: number;
  averageProcessingTime: number;
  errorRate: number;
  uptime: string;
  memoryUsage: string;
  cpuUsage: number;
  performance: {
    excellent: number;
    good: number;
    average: number;
    poor: number;
  };
}

export class StatsService {
  private static db = new Database();
  private static logger = Logger.getInstance();

  // Get stats data
  static async getStats(): Promise<IndexerStats | null> {
    try {
      const result = await this.db.query(`
        SELECT * FROM indexer_stats 
        ORDER BY created_at DESC 
        LIMIT 1
      `);

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToIndexerStats(result.rows[0]);
    } catch (error) {
      this.logger.error('Error getting stats:', error);
      throw error;
    }
  }

  // Update stats
  static async updateStats(statsData: {
    totalEvents: number;
    eventsPerSecond: number;
    averageProcessingTime: number;
    errorRate: number;
    uptime: string;
    memoryUsage: string;
    cpuUsage: number;
  }): Promise<IndexerStats> {
    try {
      const result = await this.db.query(`
        INSERT INTO indexer_stats (
          total_events, events_per_second, average_processing_time,
          error_rate, uptime, memory_usage, cpu_usage,
          created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
        RETURNING *
      `, [
        statsData.totalEvents,
        statsData.eventsPerSecond,
        statsData.averageProcessingTime,
        statsData.errorRate,
        statsData.uptime,
        statsData.memoryUsage,
        statsData.cpuUsage
      ]);

      const indexerStats = this.mapRowToIndexerStats(result.rows[0]);
      this.logger.info(`Stats updated: ${statsData.eventsPerSecond} events/sec`);
      return indexerStats;
    } catch (error) {
      this.logger.error('Error updating stats:', error);
      throw error;
    }
  }

  // Get stats metrics
  static async getStatsMetrics(): Promise<StatsMetrics> {
    try {
      const result = await this.db.query(`
        SELECT 
          AVG(total_events) as avg_total_events,
          AVG(events_per_second) as avg_events_per_second,
          AVG(average_processing_time) as avg_processing_time,
          AVG(error_rate) as avg_error_rate,
          AVG(CAST(memory_usage AS NUMERIC)) as avg_memory_usage,
          AVG(cpu_usage) as avg_cpu_usage,
          COUNT(CASE WHEN events_per_second > 100 THEN 1 END) as excellent_count,
          COUNT(CASE WHEN events_per_second BETWEEN 50 AND 100 THEN 1 END) as good_count,
          COUNT(CASE WHEN events_per_second BETWEEN 10 AND 50 THEN 1 END) as average_count,
          COUNT(CASE WHEN events_per_second < 10 THEN 1 END) as poor_count,
          COUNT(*) as total_count
        FROM indexer_stats 
        WHERE created_at > NOW() - INTERVAL '24 hours'
      `);

      const metrics = result.rows[0];
      const total = parseInt(metrics.total_count);

      return {
        totalEvents: parseInt(metrics.avg_total_events) || 0,
        eventsPerSecond: parseFloat(metrics.avg_events_per_second) || 0,
        averageProcessingTime: parseFloat(metrics.avg_processing_time) || 0,
        errorRate: parseFloat(metrics.avg_error_rate) || 0,
        uptime: '0', // Calculate from system uptime
        memoryUsage: metrics.avg_memory_usage?.toString() || '0',
        cpuUsage: parseFloat(metrics.avg_cpu_usage) || 0,
        performance: {
          excellent: total > 0 ? (parseInt(metrics.excellent_count) / total) * 100 : 0,
          good: total > 0 ? (parseInt(metrics.good_count) / total) * 100 : 0,
          average: total > 0 ? (parseInt(metrics.average_count) / total) * 100 : 0,
          poor: total > 0 ? (parseInt(metrics.poor_count) / total) * 100 : 0
        }
      };
    } catch (error) {
      this.logger.error('Error getting stats metrics:', error);
      throw error;
    }
  }

  // Update stats metrics
  static async updateStatsMetrics(metrics: any): Promise<void> {
    try {
      await this.db.query(`
        INSERT INTO stats_metrics (
          total_events, events_per_second, average_processing_time,
          error_rate, uptime, memory_usage, cpu_usage, performance,
          created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
        ON CONFLICT (id) 
        DO UPDATE SET 
          total_events = EXCLUDED.total_events,
          events_per_second = EXCLUDED.events_per_second,
          average_processing_time = EXCLUDED.average_processing_time,
          error_rate = EXCLUDED.error_rate,
          uptime = EXCLUDED.uptime,
          memory_usage = EXCLUDED.memory_usage,
          cpu_usage = EXCLUDED.cpu_usage,
          performance = EXCLUDED.performance,
          updated_at = NOW()
      `, [
        metrics.totalEvents || 0,
        metrics.eventsPerSecond || 0,
        metrics.averageProcessingTime || 0,
        metrics.errorRate || 0,
        metrics.uptime || '0',
        metrics.memoryUsage || '0',
        metrics.cpuUsage || 0,
        JSON.stringify(metrics.performance)
      ]);

      this.logger.info('Stats metrics updated');
    } catch (error) {
      this.logger.error('Error updating stats metrics:', error);
      throw error;
    }
  }

  // Get performance trends
  static async getPerformanceTrends(hours: number = 24): Promise<{
    timestamp: string;
    eventsPerSecond: number;
    errorRate: number;
    memoryUsage: string;
    cpuUsage: number;
  }[]> {
    try {
      const result = await this.db.query(`
        SELECT 
          created_at as timestamp,
          events_per_second,
          error_rate,
          memory_usage,
          cpu_usage
        FROM indexer_stats 
        WHERE created_at > NOW() - INTERVAL '${hours} hours'
        ORDER BY created_at ASC
      `);

      return result.rows.map(row => ({
        timestamp: row.timestamp,
        eventsPerSecond: parseFloat(row.events_per_second) || 0,
        errorRate: parseFloat(row.error_rate) || 0,
        memoryUsage: row.memory_usage,
        cpuUsage: parseFloat(row.cpu_usage) || 0
      }));
    } catch (error) {
      this.logger.error('Error getting performance trends:', error);
      throw error;
    }
  }

  // Get system performance summary
  static async getSystemPerformanceSummary(): Promise<{
    current: IndexerStats;
    trends: any[];
    alerts: string[];
  }> {
    try {
      const current = await this.getStats();
      const trends = await this.getPerformanceTrends(24);
      const alerts: string[] = [];

      if (current) {
        if (current.errorRate > 5) {
          alerts.push('High error rate detected');
        }
        if (current.eventsPerSecond < 10) {
          alerts.push('Low processing speed');
        }
        if (parseFloat(current.memoryUsage) > 80) {
          alerts.push('High memory usage');
        }
        if (current.cpuUsage > 90) {
          alerts.push('High CPU usage');
        }
      }

      return {
        current: current || {
          id: '',
          totalEvents: 0,
          eventsPerSecond: 0,
          averageProcessingTime: 0,
          errorRate: 0,
          uptime: '0',
          memoryUsage: '0',
          cpuUsage: 0,
          createdAt: '',
          updatedAt: ''
        },
        trends,
        alerts
      };
    } catch (error) {
      this.logger.error('Error getting system performance summary:', error);
      throw error;
    }
  }

  // Helper method to map database row to IndexerStats
  private static mapRowToIndexerStats(row: any): IndexerStats {
    return {
      id: row.id,
      totalEvents: row.total_events,
      eventsPerSecond: row.events_per_second,
      averageProcessingTime: row.average_processing_time,
      errorRate: row.error_rate,
      uptime: row.uptime,
      memoryUsage: row.memory_usage,
      cpuUsage: row.cpu_usage,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}
