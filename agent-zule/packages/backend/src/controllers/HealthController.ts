import { Request, Response } from 'express';
import { Logger } from '../utils/Logger';
import { DatabaseConfig } from '../config/DatabaseConfig';
import { EnvioIndexerService } from '../services/envio/EnvioIndexerService';

export class HealthController {
  private static logger = Logger.getInstance();
  private static dbConfig = DatabaseConfig.getInstance();

  /**
   * Basic health check endpoint
   */
  public static healthCheck = async (req: Request, res: Response): Promise<void> => {
    try {
      const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'Agent Zule Backend',
        version: process.env.npm_package_version || '1.0.0',
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development'
      };

      res.status(200).json({
        success: true,
        data: health
      });

    } catch (error) {
      this.logger.error('Health check failed', error);
      res.status(500).json({
        success: false,
        error: 'Health check failed',
        message: 'Internal server error'
      });
    }
  };

  /**
   * Comprehensive health check with dependencies
   */
  public static detailedHealthCheck = async (req: Request, res: Response): Promise<void> => {
    try {
      const startTime = Date.now();
      
      // Check database connection
      const dbHealth = await this.checkDatabaseHealth();
      
      // Check Envio indexer
      const envioHealth = await this.checkEnvioHealth();
      
      // Check AI services
      const aiHealth = await this.checkAIHealth();
      
      const totalTime = Date.now() - startTime;

      const overallStatus = dbHealth.status === 'healthy' && 
                           envioHealth.status === 'healthy' && 
                           aiHealth.status === 'healthy' ? 'healthy' : 'degraded';

      const health = {
        status: overallStatus,
        timestamp: new Date().toISOString(),
        service: 'Agent Zule Backend',
        version: process.env.npm_package_version || '1.0.0',
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        responseTime: totalTime,
        dependencies: {
          database: dbHealth,
          envio: envioHealth,
          ai: aiHealth
        },
        system: {
          memory: process.memoryUsage(),
          cpu: process.cpuUsage(),
          platform: process.platform,
          nodeVersion: process.version
        }
      };

      const statusCode = overallStatus === 'healthy' ? 200 : 503;

      res.status(statusCode).json({
        success: overallStatus === 'healthy',
        data: health
      });

    } catch (error) {
      this.logger.error('Detailed health check failed', error);
      res.status(500).json({
        success: false,
        error: 'Detailed health check failed',
        message: 'Internal server error'
      });
    }
  };

  /**
   * Database health check
   */
  public static databaseHealth = async (req: Request, res: Response): Promise<void> => {
    try {
      const dbHealth = await this.checkDatabaseHealth();

      const statusCode = dbHealth.status === 'healthy' ? 200 : 503;

      res.status(statusCode).json({
        success: dbHealth.status === 'healthy',
        data: dbHealth
      });

    } catch (error) {
      this.logger.error('Database health check failed', error);
      res.status(500).json({
        success: false,
        error: 'Database health check failed',
        message: 'Internal server error'
      });
    }
  };

  /**
   * Envio health check
   */
  public static envioHealth = async (req: Request, res: Response): Promise<void> => {
    try {
      const envioHealth = await this.checkEnvioHealth();

      const statusCode = envioHealth.status === 'healthy' ? 200 : 503;

      res.status(statusCode).json({
        success: envioHealth.status === 'healthy',
        data: envioHealth
      });

    } catch (error) {
      this.logger.error('Envio health check failed', error);
      res.status(500).json({
        success: false,
        error: 'Envio health check failed',
        message: 'Internal server error'
      });
    }
  };

  /**
   * AI services health check
   */
  public static aiHealth = async (req: Request, res: Response): Promise<void> => {
    try {
      const aiHealth = await this.checkAIHealth();

      const statusCode = aiHealth.status === 'healthy' ? 200 : 503;

      res.status(statusCode).json({
        success: aiHealth.status === 'healthy',
        data: aiHealth
      });

    } catch (error) {
      this.logger.error('AI health check failed', error);
      res.status(500).json({
        success: false,
        error: 'AI health check failed',
        message: 'Internal server error'
      });
    }
  };

  /**
   * Readiness probe for Kubernetes
   */
  public static readiness = async (req: Request, res: Response): Promise<void> => {
    try {
      // Check if all critical services are ready
      const dbReady = await this.isDatabaseReady();
      
      if (!dbReady) {
        res.status(503).json({
          success: false,
          error: 'Not ready',
          message: 'Database not ready'
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Ready to serve traffic'
      });

    } catch (error) {
      this.logger.error('Readiness check failed', error);
      res.status(503).json({
        success: false,
        error: 'Not ready',
        message: 'Service not ready'
      });
    }
  };

  /**
   * Liveness probe for Kubernetes
   */
  public static liveness = async (req: Request, res: Response): Promise<void> => {
    // Simple liveness check - if we can respond, we're alive
    res.status(200).json({
      success: true,
      message: 'Alive',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  };

  // Private helper methods
  private static async checkDatabaseHealth(): Promise<{
    status: 'healthy' | 'unhealthy';
    responseTime: number;
    connectionState: string;
    lastError?: string;
  }> {
    const startTime = Date.now();
    
    try {
      // This would check actual database connection
      // For now, we'll simulate a healthy database
      const responseTime = Date.now() - startTime;
      
      return {
        status: 'healthy',
        responseTime,
        connectionState: 'connected'
      };

    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      return {
        status: 'unhealthy',
        responseTime,
        connectionState: 'disconnected',
        lastError: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private static async checkEnvioHealth(): Promise<{
    status: 'healthy' | 'unhealthy';
    responseTime: number;
    lastBlock: number;
    errors: string[];
  }> {
    try {
      const envioService = EnvioIndexerService.getInstance();
      const health = await envioService.healthCheck();

      return {
        status: health.status,
        responseTime: health.responseTime,
        lastBlock: health.lastBlock,
        errors: health.errors
      };

    } catch (error) {
      return {
        status: 'unhealthy',
        responseTime: 0,
        lastBlock: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  private static async checkAIHealth(): Promise<{
    status: 'healthy' | 'unhealthy';
    services: {
      portfolioAnalyzer: boolean;
      yieldOptimizer: boolean;
      dcaManager: boolean;
      riskAssessor: boolean;
    };
    lastError?: string;
  }> {
    try {
      // Check if AI services can be imported and instantiated
      const { PortfolioAnalyzer } = await import('../services/ai/PortfolioAnalyzer');
      const { YieldOptimizer } = await import('../services/ai/YieldOptimizer');
      const { DCAManager } = await import('../services/ai/DCAManager');
      const { RiskAssessor } = await import('../services/ai/RiskAssessor');

      const portfolioAnalyzer = PortfolioAnalyzer.getInstance();
      const yieldOptimizer = YieldOptimizer.getInstance();
      const dcaManager = DCAManager.getInstance();
      const riskAssessor = RiskAssessor.getInstance();

      return {
        status: 'healthy',
        services: {
          portfolioAnalyzer: !!portfolioAnalyzer,
          yieldOptimizer: !!yieldOptimizer,
          dcaManager: !!dcaManager,
          riskAssessor: !!riskAssessor
        }
      };

    } catch (error) {
      return {
        status: 'unhealthy',
        services: {
          portfolioAnalyzer: false,
          yieldOptimizer: false,
          dcaManager: false,
          riskAssessor: false
        },
        lastError: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private static async isDatabaseReady(): Promise<boolean> {
    try {
      // Check if database connection is ready
      // This would be a simple ping or lightweight query
      return true;
    } catch (error) {
      return false;
    }
  }
}
