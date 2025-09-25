import { NextFunction, Request, Response } from 'express';
import Joi from 'joi';
import { Logger } from '../utils/Logger';

export class ValidationMiddleware {
  private static logger = Logger.getInstance();

  /**
   * Validate request body against schema
   */
  public static validateBody = (schema: Joi.ObjectSchema) => {
    return (req: Request, res: Response, next: NextFunction): void => {
      const { error, value } = schema.validate(req.body, {
        abortEarly: false,
        stripUnknown: true
      });

      if (error) {
        const errors = error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context?.value
        }));

        this.logger.warn('Request validation failed', {
          method: req.method,
          url: req.url,
          errors
        });

        res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          details: errors
        });
        return;
      }

      req.body = value;
      next();
    };
  };

  /**
   * Validate request query parameters against schema
   */
  public static validateQuery = (schema: Joi.ObjectSchema) => {
    return (req: Request, res: Response, next: NextFunction): void => {
      const { error, value } = schema.validate(req.query, {
        abortEarly: false,
        stripUnknown: true
      });

      if (error) {
        const errors = error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context?.value
        }));

        this.logger.warn('Query validation failed', {
          method: req.method,
          url: req.url,
          errors
        });

        res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Query validation failed',
          details: errors
        });
        return;
      }

      req.query = value;
      next();
    };
  };

  /**
   * Validate request parameters against schema
   */
  public static validateParams = (schema: Joi.ObjectSchema) => {
    return (req: Request, res: Response, next: NextFunction): void => {
      const { error, value } = schema.validate(req.params, {
        abortEarly: false,
        stripUnknown: true
      });

      if (error) {
        const errors = error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context?.value
        }));

        this.logger.warn('Params validation failed', {
          method: req.method,
          url: req.url,
          errors
        });

        res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Params validation failed',
          details: errors
        });
        return;
      }

      req.params = value;
      next();
    };
  };

  /**
   * Generic request validation middleware
   */
  public static validateRequest = (req: Request, res: Response, next: NextFunction): void => {
    // Basic request validation
    if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
      if (!req.body || Object.keys(req.body).length === 0) {
        res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Request body is required for this method'
        });
        return;
      }
    }

    // Validate content type for JSON requests
    if (req.method !== 'GET' && req.method !== 'DELETE') {
      const contentType = req.get('Content-Type');
      if (!contentType || !contentType.includes('application/json')) {
        res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Content-Type must be application/json'
        });
        return;
      }
    }

    next();
  };

  /**
   * Validate MongoDB ObjectId
   */
  public static validateObjectId = (field: string = 'id') => {
    return (req: Request, res: Response, next: NextFunction): void => {
      const value = req.params[field];
      
      if (!value) {
        res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: `${field} parameter is required`
        });
        return;
      }

      // Basic ObjectId validation (24 hex characters)
      const objectIdRegex = /^[0-9a-fA-F]{24}$/;
      if (!objectIdRegex.test(value)) {
        res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: `Invalid ${field} format`
        });
        return;
      }

      next();
    };
  };

  /**
   * Validate wallet address format
   */
  public static validateWalletAddress = (field: string = 'walletAddress') => {
    return (req: Request, res: Response, next: NextFunction): void => {
      const walletAddress = req.body[field] || req.params[field] || req.query[field];
      
      if (!walletAddress) {
        res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: `${field} is required`
        });
        return;
      }

      // Basic Ethereum address validation
      const ethAddressRegex = /^0x[a-fA-F0-9]{40}$/;
      if (!ethAddressRegex.test(walletAddress)) {
        res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: `Invalid ${field} format`
        });
        return;
      }

      next();
    };
  };

  /**
   * Validate pagination parameters
   */
  public static validatePagination = (req: Request, res: Response, next: NextFunction): void => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = parseInt(req.query.offset as string) || 0;

    if (page < 1) {
      res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Page must be greater than 0'
      });
      return;
    }

    if (limit < 1 || limit > 100) {
      res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Limit must be between 1 and 100'
      });
      return;
    }

    if (offset < 0) {
      res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Offset must be greater than or equal to 0'
      });
      return;
    }

    req.query.page = page.toString();
    req.query.limit = limit.toString();
    req.query.offset = offset.toString();

    next();
  };

  /**
   * Validate date range parameters
   */
  public static validateDateRange = (req: Request, res: Response, next: NextFunction): void => {
    const fromDate = req.query.fromDate as string;
    const toDate = req.query.toDate as string;

    if (fromDate) {
      const from = new Date(fromDate);
      if (isNaN(from.getTime())) {
        res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Invalid fromDate format'
        });
        return;
      }
    }

    if (toDate) {
      const to = new Date(toDate);
      if (isNaN(to.getTime())) {
        res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Invalid toDate format'
        });
        return;
      }
    }

    if (fromDate && toDate) {
      const from = new Date(fromDate);
      const to = new Date(toDate);
      
      if (from > to) {
        res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'fromDate must be before toDate'
        });
        return;
      }
    }

    next();
  };
}

// Common validation schemas
export const ValidationSchemas = {
  // Portfolio schemas
  portfolio: {
    create: Joi.object({
      name: Joi.string().required().min(1).max(100),
      description: Joi.string().optional().max(500),
      walletAddress: Joi.string().required().pattern(/^0x[a-fA-F0-9]{40}$/),
      riskTolerance: Joi.string().valid('low', 'medium', 'high').required(),
      investmentGoals: Joi.array().items(Joi.string()).optional(),
      strategy: Joi.object({
        yieldOptimizationEnabled: Joi.boolean().default(true),
        dcaEnabled: Joi.boolean().default(false),
        rebalancingEnabled: Joi.boolean().default(true),
        riskManagementEnabled: Joi.boolean().default(true)
      }).optional()
    }),

    update: Joi.object({
      name: Joi.string().optional().min(1).max(100),
      description: Joi.string().optional().max(500),
      riskTolerance: Joi.string().valid('low', 'medium', 'high').optional(),
      investmentGoals: Joi.array().items(Joi.string()).optional(),
      strategy: Joi.object({
        yieldOptimizationEnabled: Joi.boolean().optional(),
        dcaEnabled: Joi.boolean().optional(),
        rebalancingEnabled: Joi.boolean().optional(),
        riskManagementEnabled: Joi.boolean().optional()
      }).optional()
    })
  },

  // Permission schemas
  permission: {
    create: Joi.object({
      agentId: Joi.string().required(),
      type: Joi.string().valid(
        'trade_execution',
        'portfolio_rebalancing',
        'yield_optimization',
        'dca_execution',
        'risk_management',
        'emergency_actions'
      ).required(),
      scope: Joi.object({
        tokens: Joi.array().items(Joi.string()).optional(),
        maxAmount: Joi.string().required(),
        maxPercentage: Joi.number().min(0).max(1).required(),
        timeWindows: Joi.array().items(Joi.object({
          start: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
          end: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
          days: Joi.array().items(Joi.number().min(0).max(6)).required(),
          timezone: Joi.string().default('UTC')
        })).optional(),
        frequency: Joi.object({
          maxTransactions: Joi.number().min(1).required(),
          period: Joi.string().valid('hour', 'day', 'week', 'month').required(),
          resetTime: Joi.string().optional()
        }).required()
      }).required(),
      conditions: Joi.array().items(Joi.object({
        type: Joi.string().valid(
          'volatility_threshold',
          'price_change',
          'volume_threshold',
          'market_condition',
          'portfolio_value',
          'time_based',
          'community_consensus',
          'risk_metrics'
        ).required(),
        parameters: Joi.object().required(),
        operator: Joi.string().valid('and', 'or').default('and'),
        priority: Joi.number().default(1),
        isActive: Joi.boolean().default(true)
      })).optional(),
      metadata: Joi.object({
        description: Joi.string().required(),
        riskLevel: Joi.string().valid('low', 'medium', 'high').default('medium'),
        autoRenew: Joi.boolean().default(false),
        requiresConfirmation: Joi.boolean().default(false),
        communityVotingEnabled: Joi.boolean().default(true),
        escalationThreshold: Joi.number().min(0).max(1).default(0.8)
      }).required()
    })
  },

  // Recommendation schemas
  recommendation: {
    vote: Joi.object({
      vote: Joi.string().valid('approve', 'reject').required(),
      reasoning: Joi.string().optional().max(500)
    })
  },

  // Common schemas
  common: {
    pagination: Joi.object({
      page: Joi.number().min(1).default(1),
      limit: Joi.number().min(1).max(100).default(10),
      offset: Joi.number().min(0).default(0)
    }),

    dateRange: Joi.object({
      fromDate: Joi.date().optional(),
      toDate: Joi.date().optional()
    }),

    id: Joi.object({
      id: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required()
    })
  }
};
