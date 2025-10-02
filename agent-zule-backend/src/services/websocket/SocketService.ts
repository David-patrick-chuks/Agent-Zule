import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { Logger } from '../../utils/Logger';
import { EnvioIndexerService } from '../envio/EnvioIndexerService';
import { CrossChainMonitorService } from '../envio/CrossChainMonitorService';
import { DataProcessorService } from '../envio/DataProcessorService';

export interface SocketUser {
  id: string;
  userId: string;
  socketId: string;
  connectedAt: Date;
  lastActivity: Date;
  subscriptions: string[];
}

export interface SocketMessage {
  type: string;
  data: any;
  timestamp: Date;
  userId?: string;
}

export interface Subscription {
  userId: string;
  channel: string;
  filters?: Record<string, any> | null;
  createdAt: Date;
}

export class SocketService {
  private static instance: SocketService;
  private io: SocketIOServer;
  private logger = Logger.getInstance();
  private envioService: EnvioIndexerService;
  private crossChainService: CrossChainMonitorService;
  private dataProcessor: DataProcessorService;
  private connectedUsers: Map<string, SocketUser> = new Map();
  private subscriptions: Map<string, Subscription[]> = new Map();
  private isMonitoring = false;
  private monitoringInterval?: NodeJS.Timeout | null;

  private constructor(server: HTTPServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true
      },
      transports: ['websocket', 'polling']
    });

    this.envioService = EnvioIndexerService.getInstance();
    this.crossChainService = CrossChainMonitorService.getInstance();
    this.dataProcessor = DataProcessorService.getInstance();

    this.setupEventHandlers();
    this.startMonitoring();
  }

  public static getInstance(server?: HTTPServer): SocketService {
    if (!SocketService.instance && server) {
      SocketService.instance = new SocketService(server);
    }
    return SocketService.instance;
  }

  /**
   * Setup Socket.io event handlers
   */
  private setupEventHandlers(): void {
    this.io.on('connection', (socket) => {
      this.logger.logEnvio('SocketService', 'client_connected', { socketId: socket.id });

      // Handle user authentication
      socket.on('authenticate', (data: { userId: string }) => {
        this.handleAuthentication(socket, data.userId);
      });

      // Handle subscription requests
      socket.on('subscribe', (data: { channel: string; filters?: Record<string, any> }) => {
        this.handleSubscription(socket, data.channel, data.filters);
      });

      // Handle unsubscription requests
      socket.on('unsubscribe', (data: { channel: string }) => {
        this.handleUnsubscription(socket, data.channel);
      });

      // Handle custom events
      socket.on('custom_event', (data: any) => {
        this.handleCustomEvent(socket, data);
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        this.handleDisconnection(socket);
      });

      // Handle ping/pong for connection health
      socket.on('ping', () => {
        socket.emit('pong', { timestamp: new Date() });
      });
    });
  }

  /**
   * Handle user authentication
   */
  private handleAuthentication(socket: any, userId: string): void {
    try {
      const socketUser: SocketUser = {
        id: socket.id,
        userId,
        socketId: socket.id,
        connectedAt: new Date(),
        lastActivity: new Date(),
        subscriptions: []
      };

      this.connectedUsers.set(socket.id, socketUser);
      socket.join(`user:${userId}`);

      this.logger.logEnvio('SocketService', 'user_authenticated', {
        socketId: socket.id,
        userId
      });

      socket.emit('authenticated', {
        success: true,
        userId,
        timestamp: new Date()
      });

    } catch (error) {
      this.logger.error('Failed to authenticate user', error, { socketId: socket.id, userId });
      socket.emit('authentication_error', {
        success: false,
        error: 'Authentication failed'
      });
    }
  }

  /**
   * Handle subscription requests
   */
  private handleSubscription(socket: any, channel: string, filters?: Record<string, any>): void {
    try {
      const user = this.connectedUsers.get(socket.id);
      if (!user) {
        socket.emit('subscription_error', {
          channel,
          error: 'User not authenticated'
        });
        return;
      }

      // Add to user subscriptions
      user.subscriptions.push(channel);
      user.lastActivity = new Date();

      // Create subscription record
      const subscription: Subscription = {
        userId: user.userId,
        channel,
        filters,
        createdAt: new Date()
      };

      if (!this.subscriptions.has(user.userId)) {
        this.subscriptions.set(user.userId, []);
      }
      this.subscriptions.get(user.userId)!.push(subscription);

      // Join channel room
      socket.join(`channel:${channel}`);

      this.logger.logEnvio('SocketService', 'user_subscribed', {
        userId: user.userId,
        channel,
        filters
      });

      socket.emit('subscribed', {
        channel,
        success: true,
        timestamp: new Date()
      });

    } catch (error) {
      this.logger.error('Failed to handle subscription', error, { socketId: socket.id, channel });
      socket.emit('subscription_error', {
        channel,
        error: 'Subscription failed'
      });
    }
  }

  /**
   * Handle unsubscription requests
   */
  private handleUnsubscription(socket: any, channel: string): void {
    try {
      const user = this.connectedUsers.get(socket.id);
      if (!user) {
        return;
      }

      // Remove from user subscriptions
      user.subscriptions = user.subscriptions.filter(sub => sub !== channel);
      user.lastActivity = new Date();

      // Remove from subscriptions map
      const userSubscriptions = this.subscriptions.get(user.userId);
      if (userSubscriptions) {
        const filtered = userSubscriptions.filter(sub => sub.channel !== channel);
        this.subscriptions.set(user.userId, filtered);
      }

      // Leave channel room
      socket.leave(`channel:${channel}`);

      this.logger.logEnvio('SocketService', 'user_unsubscribed', {
        userId: user.userId,
        channel
      });

      socket.emit('unsubscribed', {
        channel,
        success: true,
        timestamp: new Date()
      });

    } catch (error) {
      this.logger.error('Failed to handle unsubscription', error, { socketId: socket.id, channel });
    }
  }

  /**
   * Handle custom events
   */
  private handleCustomEvent(socket: any, data: any): void {
    try {
      const user = this.connectedUsers.get(socket.id);
      if (!user) {
        return;
      }

      user.lastActivity = new Date();

      this.logger.logEnvio('SocketService', 'custom_event_received', {
        userId: user.userId,
        eventType: data.type
      });

      // Handle different event types
      switch (data.type) {
        case 'portfolio_update':
          this.handlePortfolioUpdate(socket, data);
          break;
        case 'recommendation_request':
          this.handleRecommendationRequest(socket, data);
          break;
        case 'permission_check':
          this.handlePermissionCheck(socket, data);
          break;
        default:
          this.logger.warn('Unknown custom event type', { type: data.type });
      }

    } catch (error) {
      this.logger.error('Failed to handle custom event', error, { socketId: socket.id });
    }
  }

  /**
   * Handle disconnection
   */
  private handleDisconnection(socket: any): void {
    try {
      const user = this.connectedUsers.get(socket.id);
      if (user) {
        this.connectedUsers.delete(socket.id);
        this.subscriptions.delete(user.userId);

        this.logger.logEnvio('SocketService', 'user_disconnected', {
          userId: user.userId,
          socketId: socket.id,
          connectionDuration: Date.now() - user.connectedAt.getTime()
        });
      }

    } catch (error) {
      this.logger.error('Failed to handle disconnection', error, { socketId: socket.id });
    }
  }

  /**
   * Start monitoring for real-time updates
   */
  private startMonitoring(): void {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    this.logger.logEnvio('SocketService', 'monitoring_started', {});

    // Monitor every 5 seconds
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.monitorPortfolioUpdates();
        await this.monitorMarketData();
        await this.monitorCrossChainOpportunities();
        await this.monitorRecommendations();
      } catch (error) {
        this.logger.error('Error in monitoring loop', error);
      }
    }, 5000);

  }

  /**
   * Stop monitoring
   */
  public stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }
    this.isMonitoring = false;
    this.logger.logEnvio('SocketService', 'monitoring_stopped', {});
  }

  /**
   * Monitor portfolio updates
   */
  private async monitorPortfolioUpdates(): Promise<void> {
    try {
      // Get all connected users
      for (const [socketId, user] of this.connectedUsers) {
        if (user.subscriptions.includes('portfolio')) {
          // Get portfolio updates for user
          const portfolioData = await this.getPortfolioUpdates(user.userId);
          if (portfolioData) {
            this.emitToUser(user.userId, 'portfolio_update', portfolioData);
          }
        }
      }
    } catch (error) {
      this.logger.error('Failed to monitor portfolio updates', error);
    }
  }

  /**
   * Monitor market data
   */
  private async monitorMarketData(): Promise<void> {
    try {
      // Get market data updates
      const marketData = await this.dataProcessor.processMarketData();
      
      // Emit to all users subscribed to market data
      this.emitToChannel('market_data', 'market_update', marketData);

    } catch (error) {
      this.logger.error('Failed to monitor market data', error);
    }
  }

  /**
   * Monitor cross-chain opportunities
   */
  private async monitorCrossChainOpportunities(): Promise<void> {
    try {
      // Get cross-chain opportunities
      const opportunities = await this.crossChainService.getOpportunities();
      
      if (opportunities.length > 0) {
        this.emitToChannel('cross_chain', 'opportunities_update', {
          opportunities,
          timestamp: new Date()
        });
      }

    } catch (error) {
      this.logger.error('Failed to monitor cross-chain opportunities', error);
    }
  }

  /**
   * Monitor recommendations
   */
  private async monitorRecommendations(): Promise<void> {
    try {
      // Get new recommendations for all users
      for (const [socketId, user] of this.connectedUsers) {
        if (user.subscriptions.includes('recommendations')) {
          const recommendations = await this.getNewRecommendations(user.userId);
          if (recommendations.length > 0) {
            this.emitToUser(user.userId, 'recommendations_update', {
              recommendations,
              timestamp: new Date()
            });
          }
        }
      }

    } catch (error) {
      this.logger.error('Failed to monitor recommendations', error);
    }
  }

  /**
   * Emit message to specific user
   */
  public emitToUser(userId: string, event: string, data: any): void {
    try {
      this.io.to(`user:${userId}`).emit(event, {
        ...data,
        timestamp: new Date()
      });

      this.logger.debug('Message emitted to user', { userId, event });

    } catch (error) {
      this.logger.error('Failed to emit to user', error, { userId, event });
    }
  }

  /**
   * Emit message to channel
   */
  public emitToChannel(channel: string, event: string, data: any): void {
    try {
      this.io.to(`channel:${channel}`).emit(event, {
        ...data,
        timestamp: new Date()
      });

      this.logger.debug('Message emitted to channel', { channel, event });

    } catch (error) {
      this.logger.error('Failed to emit to channel', error, { channel, event });
    }
  }

  /**
   * Broadcast message to all connected users
   */
  public broadcast(event: string, data: any): void {
    try {
      this.io.emit(event, {
        ...data,
        timestamp: new Date()
      });

      this.logger.debug('Message broadcasted', { event });

    } catch (error) {
      this.logger.error('Failed to broadcast message', error, { event });
    }
  }

  /**
   * Get connection statistics
   */
  public getConnectionStats(): {
    totalConnections: number;
    activeUsers: number;
    subscriptions: number;
    channels: string[];
  } {
    const totalConnections = this.connectedUsers.size;
    const activeUsers = Array.from(this.connectedUsers.values())
      .filter(user => Date.now() - user.lastActivity.getTime() < 300000) // 5 minutes
      .length;
    
    const subscriptions = Array.from(this.subscriptions.values())
      .reduce((sum, userSubs) => sum + userSubs.length, 0);
    
    const channels = Array.from(new Set(
      Array.from(this.subscriptions.values())
        .flat()
        .map(sub => sub.channel)
    ));

    return {
      totalConnections,
      activeUsers,
      subscriptions,
      channels
    };
  }

  // Private helper methods
  private async getPortfolioUpdates(userId: string): Promise<any> {
    // This would get actual portfolio updates
    // For now, return mock data
    return {
      userId,
      totalValue: 10000 + Math.random() * 1000,
      pnl: Math.random() * 100 - 50,
      lastUpdated: new Date()
    };
  }

  private async getNewRecommendations(userId: string): Promise<any[]> {
    // This would get actual new recommendations
    // For now, return empty array
    return [];
  }

  private handlePortfolioUpdate(socket: any, data: any): void {
    // Handle portfolio update requests
    this.logger.debug('Portfolio update requested', { socketId: socket.id, data });
  }

  private handleRecommendationRequest(socket: any, data: any): void {
    // Handle recommendation requests
    this.logger.debug('Recommendation requested', { socketId: socket.id, data });
  }

  private handlePermissionCheck(socket: any, data: any): void {
    // Handle permission checks
    this.logger.debug('Permission check requested', { socketId: socket.id, data });
  }
}
