import compression from 'compression';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { createServer } from 'http';
import { Config } from './config/AppConfig';
import { DatabaseConfig } from './config/DatabaseConfig';
import { SocketService } from './services/websocket/SocketService';
import { BlockchainIndexer } from './services/indexer/BlockchainIndexer';
import { RealDataService } from './services/indexer/RealDataService';
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
  private server: any;
  private socketService: SocketService;
  private blockchainIndexer: BlockchainIndexer;
  private realDataService: RealDataService;
  private logger = Logger.getInstance();
  private config = Config.getConfig();
  private dbConfig = DatabaseConfig.getInstance();
  
  // Controller instances
  private healthController: HealthController;
  private portfolioController: PortfolioController;
  private recommendationController: RecommendationController;
  private permissionController: PermissionController;
  private executionController: ExecutionController;

  constructor() {
    this.app = express();
    this.server = createServer(this.app);
    this.initializeControllers();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  private initializeControllers(): void {
    this.healthController = new HealthController();
    this.portfolioController = new PortfolioController();
    // this.recommendationController = new RecommendationController(); // Commented out due to TensorFlow.js issue
    this.permissionController = new PermissionController();
    this.executionController = new ExecutionController();
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
    this.app.get('/health', (req, res) => this.healthController.getHealth(req, res));
    this.app.get(`${apiPrefix}/health`, (req, res) => this.healthController.getHealth(req, res));

    // Indexer status endpoint
    this.app.get(`${apiPrefix}/indexer/status`, (req, res) => {
      const stats = this.blockchainIndexer.getIndexerStats();
      res.json({
        success: true,
        data: stats,
        timestamp: new Date().toISOString()
      });
    });

    // Manual indexer trigger endpoint
    this.app.post(`${apiPrefix}/indexer/trigger`, async (req, res) => {
      try {
        await this.blockchainIndexer.triggerManualIndex();
        res.json({
          success: true,
          message: 'Manual indexing triggered',
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: 'Failed to trigger indexing',
          timestamp: new Date().toISOString()
        });
      }
    });

    // Portfolio routes
    this.app.get(`${apiPrefix}/portfolios/:id`, (req, res) => this.portfolioController.getPortfolio(req, res));
    this.app.put(`${apiPrefix}/portfolios/:id`, (req, res) => this.portfolioController.updatePortfolio(req, res));
    this.app.get(`${apiPrefix}/portfolios/:id/metrics`, (req, res) => this.portfolioController.getPortfolioMetrics(req, res));
    this.app.get(`${apiPrefix}/portfolios/:id/positions`, (req, res) => this.portfolioController.getPortfolioPositions(req, res));
    this.app.get(`${apiPrefix}/portfolios/:id/diversification`, (req, res) => this.portfolioController.getDiversificationAnalysis(req, res));
    this.app.get(`${apiPrefix}/portfolios/:id/risk`, (req, res) => this.portfolioController.getRiskAnalysis(req, res));
    this.app.get(`${apiPrefix}/portfolios/:id/performance`, (req, res) => this.portfolioController.getPerformanceComparison(req, res));
    this.app.post(`${apiPrefix}/portfolios/:id/rebalance`, (req, res) => this.portfolioController.rebalancePortfolio(req, res));

    // Recommendation routes (commented out due to TensorFlow.js issue)
    // this.app.get(`${apiPrefix}/recommendations`, (req, res) => this.recommendationController.getRecommendations(req, res));
    // this.app.get(`${apiPrefix}/recommendations/:id`, (req, res) => this.recommendationController.getRecommendation(req, res));
    // this.app.post(`${apiPrefix}/recommendations/:id/approve`, (req, res) => this.recommendationController.approveRecommendation(req, res));
    // this.app.post(`${apiPrefix}/recommendations/:id/reject`, (req, res) => this.recommendationController.rejectRecommendation(req, res));
    // this.app.post(`${apiPrefix}/recommendations/:id/vote`, (req, res) => this.recommendationController.voteOnRecommendation(req, res));

    // Permission routes
    this.app.get(`${apiPrefix}/permissions`, (req, res) => this.permissionController.getUserPermissions(req, res));
    this.app.post(`${apiPrefix}/permissions`, (req, res) => this.permissionController.createPermission(req, res));
    this.app.put(`${apiPrefix}/permissions/:id`, (req, res) => this.permissionController.updatePermission(req, res));
    this.app.delete(`${apiPrefix}/permissions/:id`, (req, res) => this.permissionController.revokePermission(req, res));
    this.app.post(`${apiPrefix}/permissions/:id/grant`, (req, res) => this.permissionController.grantPermission(req, res));
    this.app.post(`${apiPrefix}/permissions/:id/conditions`, (req, res) => this.permissionController.addCondition(req, res));
    this.app.delete(`${apiPrefix}/permissions/:id/conditions/:conditionId`, (req, res) => this.permissionController.removeCondition(req, res));
    this.app.get(`${apiPrefix}/permissions/:id/audit`, (req, res) => this.permissionController.getAuditLog(req, res));
    this.app.get(`${apiPrefix}/permissions/stats`, (req, res) => this.permissionController.getPermissionStats(req, res));
    this.app.post(`${apiPrefix}/permissions/check`, (req, res) => this.permissionController.checkPermission(req, res));

    // Execution routes
    this.app.post(`${apiPrefix}/executions/trade`, (req, res) => this.executionController.executeTrade(req, res));
    this.app.post(`${apiPrefix}/executions/recommendation`, (req, res) => this.executionController.executeRecommendation(req, res));
    this.app.get(`${apiPrefix}/executions/history`, (req, res) => this.executionController.getExecutionHistory(req, res));
    this.app.get(`${apiPrefix}/executions/stats`, (req, res) => this.executionController.getExecutionStats(req, res));
    this.app.post(`${apiPrefix}/executions/:id/cancel`, (req, res) => this.executionController.cancelExecution(req, res));

    // Additional routes (commented out due to TensorFlow.js issue)
    // this.app.post(`${apiPrefix}/recommendations/generate`, (req, res) => this.recommendationController.generateRecommendations(req, res));
    // this.app.get(`${apiPrefix}/recommendations/analytics`, (req, res) => this.recommendationController.getRecommendationAnalytics(req, res));
    // this.app.get(`${apiPrefix}/recommendations/top`, (req, res) => this.recommendationController.getTopRecommendations(req, res));

    // Catch-all route for undefined endpoints
    this.app.use((req, res) => {
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

      // Initialize Socket.io
      this.socketService = SocketService.getInstance(this.server);
      this.logger.info('Socket.io service initialized');

      // Initialize Blockchain Indexer
      this.blockchainIndexer = BlockchainIndexer.getInstance();
      this.blockchainIndexer.startIndexing();
      this.logger.info('🔍 Blockchain indexer started');

      // Initialize Real Data Service
      this.realDataService = RealDataService.getInstance();
      const healthCheck = await this.realDataService.healthCheck();
      this.logger.info('🚀 Real data service initialized', {
        status: healthCheck.status,
        services: healthCheck.services
      });

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

  public getServer(): any {
    return this.server;
  }

  public getSocketService(): SocketService {
    return this.socketService;
  }

  public async shutdown(): Promise<void> {
    try {
      this.logger.info('Shutting down Agent Zule Backend...');

      // Stop Socket.io monitoring
      if (this.socketService) {
        this.socketService.stopMonitoring();
      }

      // Stop Blockchain Indexer
      if (this.blockchainIndexer) {
        this.blockchainIndexer.stopIndexing();
      }

      // Disconnect from database
      await this.dbConfig.disconnect();

      this.logger.info('Agent Zule Backend shutdown complete');

    } catch (error) {
      this.logger.error('Error during shutdown', error);
      throw error;
    }
  }
}
