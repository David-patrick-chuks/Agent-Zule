import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { Config } from '../config/AppConfig';
import { Logger } from '../utils/Logger';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    walletAddress: string;
    permissions: string[];
  };
}

export class AuthMiddleware {
  private static logger = Logger.getInstance();
  private static config = Config.getConfig();

  /**
   * Authenticate JWT token
   */
  public static authenticate = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // Skip authentication for health checks and public endpoints
      if (this.isPublicEndpoint(req.path)) {
        return next();
      }

      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          message: 'Missing or invalid authorization header'
        });
        return;
      }

      const token = authHeader.substring(7);
      
      try {
        const decoded = jwt.verify(token, this.config.jwt.secret) as any;
        
        req.user = {
          id: decoded.userId,
          walletAddress: decoded.walletAddress,
          permissions: decoded.permissions || []
        };

        this.logger.debug('User authenticated', {
          userId: req.user.id,
          walletAddress: req.user.walletAddress,
          path: req.path
        });

        next();

      } catch (jwtError) {
        this.logger.warn('Invalid JWT token', { error: jwtError });
        res.status(401).json({
          success: false,
          error: 'Invalid token',
          message: 'Token is expired or invalid'
        });
        return;
      }

    } catch (error) {
      this.logger.error('Authentication error', error);
      res.status(500).json({
        success: false,
        error: 'Authentication failed',
        message: 'Internal server error during authentication'
      });
      return;
    }
  };

  /**
   * Require specific permissions
   */
  public static requirePermissions = (permissions: string[]) => {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          message: 'User must be authenticated'
        });
        return;
      }

      const hasPermission = permissions.every(permission => 
        req.user!.permissions.includes(permission)
      );

      if (!hasPermission) {
        this.logger.warn('Insufficient permissions', {
          userId: req.user.id,
          requiredPermissions: permissions,
          userPermissions: req.user.permissions,
          path: req.path
        });

        res.status(403).json({
          success: false,
          error: 'Insufficient permissions',
          message: `Required permissions: ${permissions.join(', ')}`
        });
        return;
      }

      next();
    };
  };

  /**
   * Require wallet address ownership
   */
  public static requireWalletOwnership = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    const walletAddress = req.params.walletAddress || req.body.walletAddress;
    
    if (!walletAddress) {
      res.status(400).json({
        success: false,
        error: 'Wallet address required',
        message: 'Wallet address must be provided'
      });
      return;
    }

    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
        message: 'User must be authenticated'
      });
      return;
    }

    if (req.user.walletAddress.toLowerCase() !== walletAddress.toLowerCase()) {
      this.logger.warn('Wallet address mismatch', {
        userId: req.user.id,
        userWallet: req.user.walletAddress,
        requestedWallet: walletAddress,
        path: req.path
      });

      res.status(403).json({
        success: false,
        error: 'Access denied',
        message: 'You can only access your own wallet data'
      });
      return;
    }

    next();
  };

  /**
   * Optional authentication - doesn't fail if no token provided
   */
  public static optionalAuth = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return next();
      }

      const token = authHeader.substring(7);
      
      try {
        const decoded = jwt.verify(token, this.config.jwt.secret) as any;
        
        req.user = {
          id: decoded.userId,
          walletAddress: decoded.walletAddress,
          permissions: decoded.permissions || []
        };

        this.logger.debug('Optional authentication successful', {
          userId: req.user.id,
          walletAddress: req.user.walletAddress
        });

      } catch (jwtError) {
        // Don't fail for optional auth, just continue without user
        this.logger.debug('Optional authentication failed', { error: jwtError });
      }

      next();

    } catch (error) {
      this.logger.error('Optional authentication error', error);
      next(); // Continue even on error for optional auth
    }
  };

  /**
   * Validate Farcaster signature (for Farcaster Frame integration)
   */
  public static validateFarcasterSignature = (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): void => {
    try {
      const signature = req.headers['x-farcaster-signature'] as string;
      const message = req.headers['x-farcaster-message'] as string;
      const timestamp = req.headers['x-farcaster-timestamp'] as string;

      if (!signature || !message || !timestamp) {
        res.status(400).json({
          success: false,
          error: 'Missing Farcaster headers',
          message: 'Required headers: x-farcaster-signature, x-farcaster-message, x-farcaster-timestamp'
        });
        return;
      }

      // In production, validate the signature against Farcaster's public key
      // For now, we'll do basic validation
      const messageTimestamp = parseInt(timestamp);
      const now = Math.floor(Date.now() / 1000);
      const timeDiff = Math.abs(now - messageTimestamp);

      if (timeDiff > 300) { // 5 minutes tolerance
        res.status(400).json({
          success: false,
          error: 'Invalid timestamp',
          message: 'Message timestamp is too old'
        });
        return;
      }

      // Add Farcaster user info to request
      try {
        const farcasterData = JSON.parse(message);
        req.user = {
          id: farcasterData.fid || 'unknown',
          walletAddress: farcasterData.walletAddress || 'unknown',
          permissions: ['farcaster_user']
        };
      } catch (parseError) {
        res.status(400).json({
          success: false,
          error: 'Invalid Farcaster message',
          message: 'Message format is invalid'
        });
        return;
      }

      next();

    } catch (error) {
      this.logger.error('Farcaster signature validation error', error);
      res.status(500).json({
        success: false,
        error: 'Signature validation failed',
        message: 'Internal server error during signature validation'
      });
      return;
    }
  };

  /**
   * Rate limiting for authentication attempts
   */
  private static authAttempts = new Map<string, { count: number; resetTime: number }>();

  public static rateLimitAuth = (
    req: Request,
    res: Response,
    next: NextFunction
  ): void => {
    const clientId = req.ip || 'unknown';
    const now = Date.now();
    const windowMs = 15 * 60 * 1000; // 15 minutes
    const maxAttempts = 5;

    const attempts = this.authAttempts.get(clientId);
    
    if (!attempts || now > attempts.resetTime) {
      // Reset or create new attempt tracking
      this.authAttempts.set(clientId, {
        count: 1,
        resetTime: now + windowMs
      });
      return next();
    }

    if (attempts.count >= maxAttempts) {
      this.logger.warn('Authentication rate limit exceeded', {
        clientId,
        attempts: attempts.count,
        resetTime: new Date(attempts.resetTime)
      });

      res.status(429).json({
        success: false,
        error: 'Rate limit exceeded',
        message: 'Too many authentication attempts. Please try again later.',
        retryAfter: Math.ceil((attempts.resetTime - now) / 1000)
      });
      return;
    }

    // Increment attempt count
    attempts.count++;
    next();
  };

  /**
   * Check if endpoint is public (no authentication required)
   */
  private static isPublicEndpoint(path: string): boolean {
    const publicPaths = [
      '/health',
      '/api/v1/health',
      '/api/v1/auth/login',
      '/api/v1/auth/register',
      '/api/v1/public',
      '/docs',
      '/swagger'
    ];

    return publicPaths.some(publicPath => path.startsWith(publicPath));
  }

  /**
   * Generate JWT token for user
   */
  public static generateToken(user: { id: string; walletAddress: string; permissions?: string[] }): string {
    const payload = {
      userId: user.id,
      walletAddress: user.walletAddress,
      permissions: user.permissions || [],
      iat: Math.floor(Date.now() / 1000)
    };

    return jwt.sign(payload, this.config.jwt.secret, {
      expiresIn: this.config.jwt.expiresIn
    } as jwt.SignOptions);
  }

  /**
   * Verify and decode JWT token
   */
  public static verifyToken(token: string): any {
    return jwt.verify(token, this.config.jwt.secret);
  }
}
