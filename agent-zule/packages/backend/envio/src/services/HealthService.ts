import { Database } from '@envio/database';
import { Logger } from '../../utils/Logger';

interface HealthStatus {
  id: string;
  status: string;
  uptime: string;
  lastBlock: number;
  processedEvents: number;
  errors: number;
  version: string;
  createdAt: string;
  updatedAt: string;
}

interface HealthMetrics {
  status: string;
  uptime: string;
  processedEvents: number;
  errorRate: number;
  averageProcessingTime: number;
  memoryUsage: string;
  cpuUsage: number;
}

export class HealthService {
  private static db = new Database();
  private static logger = Logger.getInstance();

  // Get health data
  static async getHealth(): Promise<HealthStatus | null> {
    try {
      const result = await this.db.query(`
        SELECT * FROM health_status 
        ORDER BY created_at DESC 
        LIMIT 1
      `);

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToHealthStatus(result.rows[0]);
    } catch (error) {
      this.logger.error('Error getting health:', error);
      throw error;
    }
  }

  // Update health
  static async updateHealth(healthData: {
    status: string;
    uptime: string;
    lastBlock: number;
    processedEvents: number;
    errors: number;
    version: string;
  }): Promise<HealthStatus> {
    try {
      const result = await this.db.query(`
        INSERT INTO health_status (
          status, uptime, last_block, processed_events, 
          errors, version, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
        RETURNING *
      `, [
        healthData.status,
        healthData.uptime,
        healthData.lastBlock,
        healthData.processedEvents,
        healthData.errors,
        healthData.version
      ]);

      const healthStatus = this.mapRowToHealthStatus(result.rows[0]);
      this.logger.info(`Health status updated: ${healthData.status}`);
      return healthStatus;
    } catch (error) {
      this.logger.error('Error updating health:', error);
      throw error;
    }
  }

  // Get health metrics
  static async getHealthMetrics(): Promise<HealthMetrics> {
    try {
      const result = await this.db.query(`
        SELECT 
          status,
          uptime,
          processed_events,
          errors,
          AVG(processed_events) as avg_processed_events,
          AVG(errors) as avg_errors
        FROM health_status 
        WHERE created_at > NOW() - INTERVAL '1 hour'
        ORDER BY created_at DESC
        LIMIT 1
      `);

      if (result.rows.length === 0) {
        return {
          status: 'unknown',
          uptime: '0',
          processedEvents: 0,
          errorRate: 0,
          averageProcessingTime: 0,
          memoryUsage: '0',
          cpuUsage: 0
        };
      }

      const metrics = result.rows[0];
      const processedEvents = parseInt(metrics.processed_events);
      const errors = parseInt(metrics.errors);

      return {
        status: metrics.status,
        uptime: metrics.uptime,
        processedEvents: processedEvents,
        errorRate: processedEvents > 0 ? (errors / processedEvents) * 100 : 0,
        averageProcessingTime: 0, // Calculate from processing times
        memoryUsage: '0', // Get from system metrics
        cpuUsage: 0 // Get from system metrics
      };
    } catch (error) {
      this.logger.error('Error getting health metrics:', error);
      throw error;
    }
  }

  // Update health metrics
  static async updateHealthMetrics(metrics: any): Promise<void> {
    try {
      await this.db.query(`
        INSERT INTO health_metrics (
          status, uptime, processed_events, error_rate,
          average_processing_time, memory_usage, cpu_usage,
          created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
        ON CONFLICT (id) 
        DO UPDATE SET 
          status = EXCLUDED.status,
          uptime = EXCLUDED.uptime,
          processed_events = EXCLUDED.processed_events,
          error_rate = EXCLUDED.error_rate,
          average_processing_time = EXCLUDED.average_processing_time,
          memory_usage = EXCLUDED.memory_usage,
          cpu_usage = EXCLUDED.cpu_usage,
          updated_at = NOW()
      `, [
        metrics.status || 'unknown',
        metrics.uptime || '0',
        metrics.processedEvents || 0,
        metrics.errorRate || 0,
        metrics.averageProcessingTime || 0,
        metrics.memoryUsage || '0',
        metrics.cpuUsage || 0
      ]);

      this.logger.info('Health metrics updated');
    } catch (error) {
      this.logger.error('Error updating health metrics:', error);
      throw error;
    }
  }

  // Check system health
  static async checkSystemHealth(): Promise<{
    database: boolean;
    indexer: boolean;
    api: boolean;
    overall: boolean;
  }> {
    try {
      // Check database connection
      const dbHealth = await this.checkDatabaseHealth();
      
      // Check indexer status
      const indexerHealth = await this.checkIndexerHealth();
      
      // Check API status
      const apiHealth = await this.checkApiHealth();
      
      const overall = dbHealth && indexerHealth && apiHealth;
      
      return {
        database: dbHealth,
        indexer: indexerHealth,
        api: apiHealth,
        overall
      };
    } catch (error) {
      this.logger.error('Error checking system health:', error);
      return {
        database: false,
        indexer: false,
        api: false,
        overall: false
      };
    }
  }

  // Check database health
  private static async checkDatabaseHealth(): Promise<boolean> {
    try {
      await this.db.query('SELECT 1');
      return true;
    } catch (error) {
      this.logger.error('Database health check failed:', error);
      return false;
    }
  }

  // Check indexer health
  private static async checkIndexerHealth(): Promise<boolean> {
    try {
      const result = await this.db.query(`
        SELECT COUNT(*) as event_count 
        FROM health_status 
        WHERE created_at > NOW() - INTERVAL '5 minutes'
      `);
      
      return parseInt(result.rows[0].event_count) > 0;
    } catch (error) {
      this.logger.error('Indexer health check failed:', error);
      return false;
    }
  }

  // Check API health
  private static async checkApiHealth(): Promise<boolean> {
    // This would typically involve checking if the API server is responding
    // For now, we'll assume it's healthy if we can reach this point
    return true;
  }

  // Helper method to map database row to HealthStatus
  private static mapRowToHealthStatus(row: any): HealthStatus {
    return {
      id: row.id,
      status: row.status,
      uptime: row.uptime,
      lastBlock: row.last_block,
      processedEvents: row.processed_events,
      errors: row.errors,
      version: row.version,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}
