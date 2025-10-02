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
    const server = app.getServer().listen(config.server.port, config.server.host, () => {
      logger.info(`🚀 Agent Zule Backend Server running on ${config.server.host}:${config.server.port}`);
      logger.info(`📊 Environment: ${Config.isDevelopment() ? 'Development' : 'Production'}`);
      logger.info(`🔗 API Version: ${config.server.apiVersion}`);
      logger.info(`📝 Log Level: ${config.logging.level}`);
      logger.info(`🔌 Socket.io enabled for real-time updates`);
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
