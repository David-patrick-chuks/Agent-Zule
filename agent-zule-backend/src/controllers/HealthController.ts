import { Request, Response } from 'express';
import { Logger } from '../utils/Logger';
import { DatabaseConfig } from '../config/DatabaseConfig';
import { EnvioIndexerService } from '../services/envio/EnvioIndexerService';
import { HyperSyncService } from '../services/envio/HyperSyncService';
import { GraphQLService } from '../services/envio/GraphQLService';
import { CrossChainMonitorService } from '../services/envio/CrossChainMonitorService';
import { DataProcessorService } from '../services/envio/DataProcessorService';
import mongoose from 'mongoose';

export class HealthController {
  private logger = Logger.getInstance();

  /**
   * Get system health status
   */
  public async getHealth(req: Request, res: Response): Promise<void> {
    try {
      this.logger.logApiRequest('GET', '/api/health', 200, 0, {});

      const healthChecks = await Promise.allSettled([
        this.checkDatabaseHealth(),
        this.checkEnvioHealth(),
        this.checkHyperSyncHealth(),
        this.checkGraphQLHealth(),
        this.checkCrossChainHealth(),
        this.checkDataProcessorHealth()
      ]);

      const results = healthChecks.map((result, index) => {
        const serviceNames = [
          'database',
          'envio',
          'hyperSync',
          'graphql',
          'crossChain',
          'dataProcessor'
        ];

        if (result.status === 'fulfilled') {
          return {
            service: serviceNames[index],
            status: 'healthy',
            ...result.value
          };
        } else {
          return {
            service: serviceNames[index],
            status: 'unhealthy',
            error: result.reason?.message || 'Unknown error'
          };
        }
      });

      const overallStatus = results.every(r => r.status === 'healthy') ? 'healthy' : 'degraded';
      const healthyServices = results.filter(r => r.status === 'healthy').length;
      const totalServices = results.length;

      res.json({
        success: true,
        data: {
          status: overallStatus,
          timestamp: new Date(),
          services: results,
          summary: {
            total: totalServices,
            healthy: healthyServices,
            unhealthy: totalServices - healthyServices,
            healthPercentage: Math.round((healthyServices / totalServices) * 100)
          }
        }
      });

    } catch (error) {
      this.logger.error('Failed to get health status', error);
      res.status(500).json({
        success: false,
        message: 'Health check failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get detailed system metrics
   */
  public async getMetrics(req: Request, res: Response): Promise<void> {
    try {
      this.logger.logApiRequest('GET', '/api/health/metrics', 200, 0, {});

      const metrics = await Promise.allSettled([
        this.getDatabaseMetrics(),
        this.getEnvioMetrics(),
        this.getSystemMetrics()
      ]);

      const results = metrics.map((result, index) => {
        const metricTypes = ['database', 'envio', 'system'];
        return {
          type: metricTypes[index],
          data: result.status === 'fulfilled' ? result.value : { error: result.reason?.message }
        };
      });

      res.json({
        success: true,
        data: {
          timestamp: new Date(),
          metrics: results
        }
      });

    } catch (error) {
      this.logger.error('Failed to get metrics', error);
      res.status(500).json({
        success: false,
        message: 'Metrics collection failed'
      });
    }
  }

  /**
   * Get service status
   */
  public async getServiceStatus(req: Request, res: Response): Promise<void> {
    try {
      const { service } = req.params;

      this.logger.logApiRequest('GET', `/api/health/service/${service}`, 200, 0, { service });

      let status;
      switch (service) {
        case 'database':
          status = await this.checkDatabaseHealth();
          break;
        case 'envio':
          status = await this.checkEnvioHealth();
          break;
        case 'hyperSync':
          status = await this.checkHyperSyncHealth();
          break;
        case 'graphql':
          status = await this.checkGraphQLHealth();
          break;
        case 'crossChain':
          status = await this.checkCrossChainHealth();
          break;
        case 'dataProcessor':
          status = await this.checkDataProcessorHealth();
          break;
        default:
          res.status(404).json({
            success: false,
            message: 'Service not found'
          });
          return;
      }

      res.json({
        success: true,
        data: {
          service,
          status: status.status,
          timestamp: new Date(),
          ...status
        }
      });

    } catch (error) {
      this.logger.error(`Failed to get ${req.params.service} status`, error);
      res.status(500).json({
        success: false,
        message: 'Service status check failed'
      });
    }
  }

  /**
   * Get system uptime and performance
   */
  public async getSystemInfo(req: Request, res: Response): Promise<void> {
    try {
      this.logger.logApiRequest('GET', '/api/health/system', 200, 0, {});

      const uptime = process.uptime();
      const memoryUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();

      res.json({
        success: true,
        data: {
          uptime: {
            seconds: uptime,
            formatted: this.formatUptime(uptime)
          },
          memory: {
            rss: memoryUsage.rss,
            heapTotal: memoryUsage.heapTotal,
            heapUsed: memoryUsage.heapUsed,
            external: memoryUsage.external,
            arrayBuffers: memoryUsage.arrayBuffers
          },
          cpu: {
            user: cpuUsage.user,
            system: cpuUsage.system
          },
          node: {
            version: process.version,
            platform: process.platform,
            arch: process.arch
          },
          timestamp: new Date()
        }
      });

    } catch (error) {
      this.logger.error('Failed to get system info', error);
      res.status(500).json({
        success: false,
        message: 'System info retrieval failed'
      });
    }
  }

  // Private health check methods
  private async checkDatabaseHealth(): Promise<any> {
    try {
      const startTime = Date.now();
      
      // Check MongoDB connection
      const connectionState = mongoose.connection.readyState;
      const isConnected = connectionState === 1;

      if (!isConnected) {
        throw new Error('Database not connected');
      }

      // Test database query
      await mongoose.connection.db.admin().ping();

      const responseTime = Date.now() - startTime;

      return {
        status: 'healthy',
        responseTime,
        connectionState: this.getConnectionStateName(connectionState),
        lastChecked: new Date()
      };

    } catch (error) {
      return {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Database connection failed',
        lastChecked: new Date()
      };
    }
  }

  private async checkEnvioHealth(): Promise<any> {
    try {
      const envioService = EnvioIndexerService.getInstance();
      const startTime = Date.now();

      // Test Envio connection
      const marketData = await envioService.getMarketData();
      const responseTime = Date.now() - startTime;

      return {
        status: 'healthy',
        responseTime,
        lastBlock: marketData.timestamp,
        totalVolume: marketData.totalVolume24h,
        lastChecked: new Date()
      };

    } catch (error) {
      return {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Envio service unavailable',
        lastChecked: new Date()
      };
    }
  }

  private async checkHyperSyncHealth(): Promise<any> {
    try {
      const hyperSyncService = HyperSyncService.getInstance();
      const healthCheck = await hyperSyncService.healthCheck();

      return {
        status: healthCheck.status,
        responseTime: healthCheck.responseTime,
        lastBlock: healthCheck.lastBlock,
        errors: healthCheck.errors,
        lastChecked: new Date()
      };

    } catch (error) {
      return {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'HyperSync service unavailable',
        lastChecked: new Date()
      };
    }
  }

  private async checkGraphQLHealth(): Promise<any> {
    try {
      const graphqlService = GraphQLService.getInstance();
      const startTime = Date.now();

      // Test GraphQL connection with a simple query
      const testQuery = {
        query: `
          query {
            __schema {
              queryType {
                name
              }
            }
          }
        `
      };

      await graphqlService.query(testQuery);
      const responseTime = Date.now() - startTime;

      return {
        status: 'healthy',
        responseTime,
        lastChecked: new Date()
      };

    } catch (error) {
      return {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'GraphQL service unavailable',
        lastChecked: new Date()
      };
    }
  }

  private async checkCrossChainHealth(): Promise<any> {
    try {
      const crossChainService = CrossChainMonitorService.getInstance();
      const startTime = Date.now();

      // Get cross-chain metrics
      const metrics = await crossChainService.getMetrics();
      const responseTime = Date.now() - startTime;

      return {
        status: 'healthy',
        responseTime,
        opportunities: metrics.totalOpportunities,
        totalProfit: metrics.totalPotentialProfit,
        lastChecked: new Date()
      };

    } catch (error) {
      return {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Cross-chain service unavailable',
        lastChecked: new Date()
      };
    }
  }

  private async checkDataProcessorHealth(): Promise<any> {
    try {
      const dataProcessor = DataProcessorService.getInstance();
      const startTime = Date.now();

      // Get cache stats
      const cacheStats = dataProcessor.getCacheStats();
      const responseTime = Date.now() - startTime;

      return {
        status: 'healthy',
        responseTime,
        cacheSize: cacheStats.size,
        lastChecked: new Date()
      };

    } catch (error) {
      return {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Data processor unavailable',
        lastChecked: new Date()
      };
    }
  }

  // Private metrics methods
  private async getDatabaseMetrics(): Promise<any> {
    try {
      const db = mongoose.connection.db;
      const stats = await db.stats();

      return {
        collections: stats.collections,
        dataSize: stats.dataSize,
        storageSize: stats.storageSize,
        indexes: stats.indexes,
        indexSize: stats.indexSize,
        avgObjSize: stats.avgObjSize,
        objects: stats.objects
      };

    } catch (error) {
      throw new Error(`Database metrics failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async getEnvioMetrics(): Promise<any> {
    try {
      const envioService = EnvioIndexerService.getInstance();
      const marketData = await envioService.getMarketData();

      return {
        totalVolume24h: marketData.totalVolume24h,
        totalFees24h: marketData.totalFees24h,
        activeUsers: marketData.activeUsers,
        transactionsCount: marketData.transactionsCount,
        averageGasPrice: marketData.averageGasPrice,
        timestamp: marketData.timestamp
      };

    } catch (error) {
      throw new Error(`Envio metrics failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async getSystemMetrics(): Promise<any> {
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    return {
      memory: {
        rss: memoryUsage.rss,
        heapTotal: memoryUsage.heapTotal,
        heapUsed: memoryUsage.heapUsed,
        external: memoryUsage.external,
        arrayBuffers: memoryUsage.arrayBuffers
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system
      },
      uptime: process.uptime(),
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch
    };
  }

  // Private helper methods
  private getConnectionStateName(state: number): string {
    const states = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    };
    return states[state as keyof typeof states] || 'unknown';
  }

  private formatUptime(seconds: number): string {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    return `${days}d ${hours}h ${minutes}m ${secs}s`;
  }
}