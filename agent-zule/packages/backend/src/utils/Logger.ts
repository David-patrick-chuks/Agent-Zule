import fs from 'fs';
import path from 'path';
import winston from 'winston';

export class Logger {
  private static instance: Logger;
  private logger: winston.Logger;

  private constructor() {
    this.logger = this.createLogger();
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private createLogger(): winston.Logger {
    // Ensure logs directory exists
    const logDir = path.dirname(process.env.LOG_FILE || './logs/agent-zule.log');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    const logFormat = winston.format.combine(
      winston.format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss'
      }),
      winston.format.errors({ stack: true }),
      winston.format.json(),
      winston.format.prettyPrint()
    );

    const consoleFormat = winston.format.combine(
      winston.format.colorize(),
      winston.format.timestamp({
        format: 'HH:mm:ss'
      }),
      winston.format.printf(({ timestamp, level, message, ...meta }) => {
        let logMessage = `${timestamp} [${level}]: ${message}`;
        
        if (Object.keys(meta).length > 0) {
          logMessage += ` ${JSON.stringify(meta, null, 2)}`;
        }
        
        return logMessage;
      })
    );

    return winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: logFormat,
      defaultMeta: { 
        service: 'agent-zule-backend',
        version: process.env.npm_package_version || '1.0.0'
      },
      transports: [
        // File transport for all logs
        new winston.transports.File({
          filename: process.env.LOG_FILE || './logs/agent-zule.log',
          maxsize: 5242880, // 5MB
          maxFiles: 5,
          format: logFormat
        }),
        
        // Separate file for error logs
        new winston.transports.File({
          filename: path.join(logDir, 'error.log'),
          level: 'error',
          maxsize: 5242880, // 5MB
          maxFiles: 5,
          format: logFormat
        }),
        
        // Console transport for development
        new winston.transports.Console({
          format: process.env.NODE_ENV === 'production' ? logFormat : consoleFormat,
          silent: process.env.NODE_ENV === 'test'
        })
      ],
      
      // Handle uncaught exceptions and unhandled rejections
      exceptionHandlers: [
        new winston.transports.File({
          filename: path.join(logDir, 'exceptions.log'),
          format: logFormat
        })
      ],
      
      rejectionHandlers: [
        new winston.transports.File({
          filename: path.join(logDir, 'rejections.log'),
          format: logFormat
        })
      ]
    });
  }

  public info(message: string, meta?: any): void {
    this.logger.info(message, meta);
  }

  public error(message: string, error?: Error | any, meta?: any): void {
    if (error instanceof Error) {
      this.logger.error(message, {
        error: error.message,
        stack: error.stack,
        ...meta
      });
    } else {
      this.logger.error(message, { error, ...meta });
    }
  }

  public warn(message: string, meta?: any): void {
    this.logger.warn(message, meta);
  }

  public debug(message: string, meta?: any): void {
    this.logger.debug(message, meta);
  }

  public http(message: string, meta?: any): void {
    this.logger.http(message, meta);
  }

  public verbose(message: string, meta?: any): void {
    this.logger.verbose(message, meta);
  }

  public silly(message: string, meta?: any): void {
    this.logger.silly(message, meta);
  }

  // Structured logging methods for specific use cases
  public logTransaction(transactionId: string, action: string, details: any): void {
    this.info(`Transaction ${action}`, {
      transactionId,
      action,
      ...details
    });
  }

  public logRecommendation(recommendationId: string, action: string, details: any): void {
    this.info(`Recommendation ${action}`, {
      recommendationId,
      action,
      ...details
    });
  }

  public logPermission(permissionId: string, action: string, details: any): void {
    this.info(`Permission ${action}`, {
      permissionId,
      action,
      ...details
    });
  }

  public logAI(service: string, action: string, details: any): void {
    this.info(`AI ${service} ${action}`, {
      service,
      action,
      ...details
    });
  }

  public logEnvio(operation: string, details: any): void {
    this.info(`Envio ${operation}`, {
      operation,
      ...details
    });
  }

  public logPortfolio(portfolioId: string, action: string, details: any): void {
    this.info(`Portfolio ${action}`, {
      portfolioId,
      action,
      ...details
    });
  }

  // Performance logging
  public logPerformance(operation: string, duration: number, details?: any): void {
    this.info(`Performance: ${operation}`, {
      operation,
      duration,
      ...details
    });
  }

  // Security logging
  public logSecurity(event: string, details: any): void {
    this.warn(`Security Event: ${event}`, {
      event,
      timestamp: new Date().toISOString(),
      ...details
    });
  }

  // API request logging
  public logApiRequest(method: string, url: string, statusCode: number, duration: number, details?: any): void {
    this.http(`API Request: ${method} ${url}`, {
      method,
      url,
      statusCode,
      duration,
      ...details
    });
  }

  // Database operation logging
  public logDatabase(operation: string, collection: string, duration: number, details?: any): void {
    this.debug(`Database ${operation}`, {
      operation,
      collection,
      duration,
      ...details
    });
  }

  // Get the underlying winston logger instance
  public getWinstonLogger(): winston.Logger {
    return this.logger;
  }

  // Create a child logger with additional context
  public child(defaultMeta: any): winston.Logger {
    return this.logger.child(defaultMeta);
  }
}
