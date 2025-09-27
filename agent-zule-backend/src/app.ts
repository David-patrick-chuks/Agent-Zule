import compression from 'compression';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { Config } from './config/AppConfig';
import { DatabaseConfig } from './config/DatabaseConfig';
import { Logger } from './utils/Logger';

// Import middleware
import { AuthMiddleware } from './middleware/AuthMiddleware';
import { ErrorMiddleware } from './middleware/ErrorMiddleware';
import { LoggingMiddleware } from './middleware/LoggingMiddleware';
import { ValidationMiddleware } from './middleware/ValidationMiddleware';

// Import controllers
import { ExecutionController } from './controllers/ExecutionController';
import { HealthController } from './controllers/HealthController';
import { PermissionController } from './controllers/PermissionController';
import { PortfolioController } from './controllers/PortfolioController';
import { RecommendationController } from './controllers/RecommendationController';

export class App {
  private app: express.Application;
  private logger = Logger.getInstance();
  private config = Config.getConfig();
  private dbConfig = DatabaseConfig.getInstance();

  constructor() {
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  private setupMiddleware(): void {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
      crossOriginEmbedderPolicy: false,
    }));

    // CORS configuration
    this.app.use(cors({
      origin: this.config.server.cors.origin,
      credentials: this.config.server.cors.credentials,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
    }));

    // Compression
    this.app.use(compression());

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Custom middleware
    this.app.use(LoggingMiddleware.logRequest);
    this.app.use(AuthMiddleware.authenticate);
    this.app.use(ValidationMiddleware.validateRequest);
  }

  private setupRoutes(): void {
    const apiPrefix = `/api/${this.config.server.apiVersion}`;

    // Health check (no auth required)
    this.app.get('/health', HealthController.healthCheck);
    this.app.get(`${apiPrefix}/health`, HealthController.healthCheck);

    // Portfolio routes
    this.app.get(`${apiPrefix}/portfolios`, PortfolioController.getPortfolios);
    this.app.get(`${apiPrefix}/portfolios/:id`, PortfolioController.getPortfolio);
    this.app.post(`${apiPrefix}/portfolios`, PortfolioController.createPortfolio);
    this.app.put(`${apiPrefix}/portfolios/:id`, PortfolioController.updatePortfolio);
    this.app.delete(`${apiPrefix}/portfolios/:id`, PortfolioController.deletePortfolio);
    this.app.get(`${apiPrefix}/portfolios/:id/analysis`, PortfolioController.analyzePortfolio);
    this.app.get(`${apiPrefix}/portfolios/:id/history`, PortfolioController.getPortfolioHistory);

    // Recommendation routes
    this.app.get(`${apiPrefix}/recommendations`, RecommendationController.getRecommendations);
    this.app.get(`${apiPrefix}/recommendations/:id`, RecommendationController.getRecommendation);
    this.app.post(`${apiPrefix}/recommendations/:id/approve`, RecommendationController.approveRecommendation);
    this.app.post(`${apiPrefix}/recommendations/:id/reject`, RecommendationController.rejectRecommendation);
    this.app.post(`${apiPrefix}/recommendations/:id/vote`, RecommendationController.voteOnRecommendation);

    // Permission routes
    this.app.get(`${apiPrefix}/permissions`, PermissionController.getPermissions);
    this.app.get(`${apiPrefix}/permissions/:id`, PermissionController.getPermission);
    this.app.post(`${apiPrefix}/permissions`, PermissionController.createPermission);
    this.app.put(`${apiPrefix}/permissions/:id`, PermissionController.updatePermission);
    this.app.delete(`${apiPrefix}/permissions/:id`, PermissionController.revokePermission);
    this.app.post(`${apiPrefix}/permissions/:id/conditions`, PermissionController.addCondition);
    this.app.delete(`${apiPrefix}/permissions/:id/conditions/:conditionId`, PermissionController.removeCondition);

    // Execution routes
    this.app.get(`${apiPrefix}/executions`, ExecutionController.getExecutions);
    this.app.get(`${apiPrefix}/executions/:id`, ExecutionController.getExecution);
    this.app.post(`${apiPrefix}/executions`, ExecutionController.executeTransaction);
    this.app.post(`${apiPrefix}/executions/:id/retry`, ExecutionController.retryExecution);

    // AI Agent routes
    this.app.post(`${apiPrefix}/ai/analyze`, PortfolioController.analyzeWithAI);
    this.app.post(`${apiPrefix}/ai/optimize-yield`, RecommendationController.optimizeYield);
    this.app.post(`${apiPrefix}/ai/dca-strategy`, RecommendationController.createDCAStrategy);
    this.app.post(`${apiPrefix}/ai/risk-assessment`, PortfolioController.assessRisk);

    // WebSocket routes for real-time updates
    this.app.get(`${apiPrefix}/ws/portfolio/:id`, PortfolioController.setupWebSocket);
    this.app.get(`${apiPrefix}/ws/recommendations`, RecommendationController.setupWebSocket);

    // Catch-all route for undefined endpoints
    this.app.use('*', (req, res) => {
      res.status(404).json({
        success: false,
        error: 'Endpoint not found',
        message: `Cannot ${req.method} ${req.originalUrl}`,
        timestamp: new Date().toISOString()
      });
    });
  }

  private setupErrorHandling(): void {
    // Error handling middleware (must be last)
    this.app.use(ErrorMiddleware.handleError);
    this.app.use(ErrorMiddleware.handleNotFound);
  }

  public async initialize(): Promise<void> {
    try {
      this.logger.info('Initializing Agent Zule Backend...');

      // Connect to database
      await this.dbConfig.connect();
      await this.dbConfig.createIndexes();

      // Initialize services
      await this.initializeServices();

      this.logger.info('Agent Zule Backend initialized successfully');

    } catch (error) {
      this.logger.error('Failed to initialize Agent Zule Backend', error);
      throw error;
    }
  }

  private async initializeServices(): Promise<void> {
    try {
      // Initialize AI services
      const { PortfolioAnalyzer } = await import('./services/ai/PortfolioAnalyzer');
      const { YieldOptimizer } = await import('./services/ai/YieldOptimizer');
      const { DCAManager } = await import('./services/ai/DCAManager');
      const { RiskAssessor } = await import('./services/ai/RiskAssessor');

      // Initialize Envio services
      const { EnvioIndexerService } = await import('./services/envio/EnvioIndexerService');
      const { HyperSyncService } = await import('./services/envio/HyperSyncService');

      // Initialize permission services
      const { PermissionManager } = await import('./services/permissions/PermissionManager');
      const { AutoRevokeService } = await import('./services/permissions/AutoRevokeService');

      this.logger.info('All services initialized successfully');

    } catch (error) {
      this.logger.error('Failed to initialize services', error);
      throw error;
    }
  }

  public getApp(): express.Application {
    return this.app;
  }

  public async shutdown(): Promise<void> {
    try {
      this.logger.info('Shutting down Agent Zule Backend...');

      // Disconnect from database
      await this.dbConfig.disconnect();

      this.logger.info('Agent Zule Backend shutdown complete');

    } catch (error) {
      this.logger.error('Error during shutdown', error);
      throw error;
    }
  }
}
