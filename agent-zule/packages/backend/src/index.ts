import { App } from './app';
import { Config } from './config/AppConfig';
import { Logger } from './utils/Logger';

const logger = Logger.getInstance();
const config = Config.getConfig();

async function startServer(): Promise<void> {
  try {
    logger.info('Starting Agent Zule Backend Server...');

    // Create and initialize app
    const app = new App();
    await app.initialize();

    // Start server
    const server = app.getApp().listen(config.server.port, config.server.host, () => {
      logger.info(`🚀 Agent Zule Backend Server running on ${config.server.host}:${config.server.port}`);
      logger.info(`📊 Environment: ${config.isDevelopment() ? 'Development' : 'Production'}`);
      logger.info(`🔗 API Version: ${config.server.apiVersion}`);
      logger.info(`📝 Log Level: ${config.logging.level}`);
      
      // Log prize strategy alignment
      logger.info('🏆 Prize Strategy Alignment:');
      logger.info('  • Best AI Agent ($1,500) - AI Portfolio Analysis, Yield Optimization, DCA Strategies');
      logger.info('  • Best Use of Envio ($2,000) - Custom Indexer, HyperSync APIs, GraphQL Queries');
      logger.info('  • Envio Bonus ($1,000) - Real-time data drives all AI decisions');
      logger.info('  • Most Innovative Use of Delegations ($500) - Conditional Permissions');
      logger.info('  • Best Farcaster Mini App ($500) - Social Integration');
    });

    // Graceful shutdown handling
    const gracefulShutdown = async (signal: string): Promise<void> => {
      logger.info(`Received ${signal}, shutting down gracefully...`);
      
      server.close(async () => {
        logger.info('HTTP server closed');
        
        try {
          await app.shutdown();
          logger.info('Graceful shutdown completed');
          process.exit(0);
        } catch (error) {
          logger.error('Error during graceful shutdown', error);
          process.exit(1);
        }
      });

      // Force shutdown after 30 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 30000);
    };

    // Handle shutdown signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception', error);
      gracefulShutdown('uncaughtException');
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection', { reason, promise });
      gracefulShutdown('unhandledRejection');
    });

  } catch (error) {
    logger.error('Failed to start Agent Zule Backend Server', error);
    process.exit(1);
  }
}

// Start the server
if (require.main === module) {
  startServer().catch((error) => {
    logger.error('Fatal error starting server', error);
    process.exit(1);
  });
}

export { App };
export default App;
