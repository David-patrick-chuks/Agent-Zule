import { NextFunction, Request, Response } from 'express';
import { Config } from '../config/AppConfig';
import { Logger } from '../utils/Logger';

export class ErrorMiddleware {
  private static logger = Logger.getInstance();
  private static config = Config.getConfig();

  /**
   * Global error handler
   */
  public static handleError = (
    error: Error,
    req: Request,
    res: Response,
    next: NextFunction
  ): void => {
    // Log the error
    this.logger.error('Unhandled error', error, {
      method: req.method,
      url: req.url,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      body: req.body,
      query: req.query,
      params: req.params
    });

    // Determine error status and message
    let statusCode = 500;
    let message = 'Internal server error';
    let code = 'INTERNAL_ERROR';

    if (error.name === 'ValidationError') {
      statusCode = 400;
      message = 'Validation error';
      code = 'VALIDATION_ERROR';
    } else if (error.name === 'CastError') {
      statusCode = 400;
      message = 'Invalid ID format';
      code = 'INVALID_ID';
    } else if (error.name === 'MongoError' || error.name === 'MongooseError') {
      statusCode = 500;
      message = 'Database error';
      code = 'DATABASE_ERROR';
    } else if (error.name === 'JsonWebTokenError') {
      statusCode = 401;
      message = 'Invalid token';
      code = 'INVALID_TOKEN';
    } else if (error.name === 'TokenExpiredError') {
      statusCode = 401;
      message = 'Token expired';
      code = 'TOKEN_EXPIRED';
    }

    // Send error response
    const errorResponse: any = {
      success: false,
      error: code,
      message: message,
      timestamp: new Date().toISOString()
    };

    // Include error details in development
    if (this.config.isDevelopment()) {
      errorResponse.details = {
        name: error.name,
        message: error.message,
        stack: error.stack
      };
    }

    res.status(statusCode).json(errorResponse);
  };

  /**
   * Handle 404 Not Found
   */
  public static handleNotFound = (
    req: Request,
    res: Response,
    next: NextFunction
  ): void => {
    this.logger.warn('Route not found', {
      method: req.method,
      url: req.url,
      ip: req.ip
    });

    res.status(404).json({
      success: false,
      error: 'NOT_FOUND',
      message: `Cannot ${req.method} ${req.url}`,
      timestamp: new Date().toISOString()
    });
  };

  /**
   * Handle async errors
   */
  public static asyncHandler = (fn: Function) => {
    return (req: Request, res: Response, next: NextFunction) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  };

  /**
   * Handle validation errors
   */
  public static handleValidationError = (
    error: any,
    req: Request,
    res: Response,
    next: NextFunction
  ): void => {
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map((err: any) => ({
        field: err.path,
        message: err.message,
        value: err.value
      }));

      this.logger.warn('Validation error', {
        errors,
        method: req.method,
        url: req.url
      });

      res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: errors,
        timestamp: new Date().toISOString()
      });
      return;
    }

    next(error);
  };
}
