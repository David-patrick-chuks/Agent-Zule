import { NextFunction, Request, Response } from 'express';
import { Logger } from '../utils/Logger';

export class LoggingMiddleware {
  private static logger = Logger.getInstance();

  /**
   * Log incoming HTTP requests
   */
  public static logRequest = (req: Request, res: Response, next: NextFunction): void => {
    const startTime = Date.now();
    
    // Log request details
    this.logger.http(`Incoming request: ${req.method} ${req.path}`, {
      method: req.method,
      url: req.url,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      contentType: req.get('Content-Type'),
      contentLength: req.get('Content-Length')
    });

    // Override res.end to log response
    const originalEnd = res.end;
    res.end = function(chunk?: any, encoding?: any): any {
      const duration = Date.now() - startTime;
      
      LoggingMiddleware.logger.logApiRequest(
        req.method,
        req.url,
        res.statusCode,
        duration,
        {
          statusCode: res.statusCode,
          contentLength: res.get('Content-Length'),
          contentType: res.get('Content-Type')
        }
      );

      // Call original end method
      originalEnd.call(this, chunk, encoding);
    };

    next();
  };

  /**
   * Log database operations
   */
  public static logDatabase = (
    operation: string,
    collection: string,
    duration: number,
    details?: any
  ): void => {
    this.logger.logDatabase(operation, collection, duration, details);
  };

  /**
   * Log AI service operations
   */
  public static logAI = (
    service: string,
    action: string,
    details: any
  ): void => {
    this.logger.logAI(service, action, details);
  };

  /**
   * Log Envio operations
   */
  public static logEnvio = (
    operation: string,
    details: any
  ): void => {
    this.logger.logEnvio('middleware', operation, details);
  };

  /**
   * Log security events
   */
  public static logSecurity = (
    event: string,
    details: any
  ): void => {
    this.logger.logSecurity(event, details);
  };
}
