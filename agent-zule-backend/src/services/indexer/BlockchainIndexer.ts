import { Logger } from '../../utils/Logger';
import { SocketService } from '../websocket/SocketService';
import { Portfolio } from '../../models/Portfolio';
import { Recommendation } from '../../models/Recommendation';
import { Transaction } from '../../models/Transaction';

interface IndexedEvent {
  id: string;
  type: 'portfolio' | 'trade' | 'permission' | 'market';
  userId?: string;
  blockNumber: number;
  transactionHash: string;
  timestamp: Date;
  data: any;
}

interface PortfolioEvent {
  userId: string;
  eventType: 'rebalanced' | 'created' | 'updated' | 'deleted';
  totalValue: number;
  positions: Array<{
    token: string;
    amount: number;
    value: number;
    allocation: number;
  }>;
  riskScore: number;
  changes?: Array<{
    token: string;
    oldAmount: number;
    newAmount: number;
    change: number;
    changePercentage: number;
  }>;
}

export class BlockchainIndexer {
  private static instance: BlockchainIndexer;
  private logger = Logger.getInstance();
  private socketService: SocketService;
  private isIndexing = false;
  private indexingInterval?: NodeJS.Timeout;

  private constructor() {
    this.socketService = SocketService.getInstance();
  }

  public static getInstance(): BlockchainIndexer {
    if (!BlockchainIndexer.instance) {
      BlockchainIndexer.instance = new BlockchainIndexer();
    }
    return BlockchainIndexer.instance;
  }

  /**
   * Start blockchain indexing
   */
  public startIndexing(): void {
    if (this.isIndexing) return;

    this.isIndexing = true;
    this.logger.info('🔍 Blockchain indexer started');

    // Index every 10 seconds for demo purposes
    this.indexingInterval = setInterval(async () => {
      try {
        await this.indexLatestEvents();
      } catch (error) {
        this.logger.error('Indexing error', error);
      }
    }, 10000);
  }

  /**
   * Stop blockchain indexing
   */
  public stopIndexing(): void {
    if (this.indexingInterval) {
      clearInterval(this.indexingInterval);
      this.indexingInterval = undefined;
    }
    this.isIndexing = false;
    this.logger.info('🔍 Blockchain indexer stopped');
  }

  /**
   * Index latest blockchain events
   */
  private async indexLatestEvents(): Promise<void> {
    try {
      // For hackathon demo, we'll simulate indexing events
      // In production, this would connect to actual blockchain nodes
      
      await Promise.all([
        this.indexPortfolioEvents(),
        this.indexTradeEvents(),
        this.indexMarketEvents(),
        this.indexPermissionEvents()
      ]);

    } catch (error) {
      this.logger.error('Failed to index latest events', error);
    }
  }

  /**
   * Index portfolio events
   */
  private async indexPortfolioEvents(): Promise<void> {
    try {
      // Get recent portfolios from database
      const recentPortfolios = await Portfolio.find({
        updatedAt: { $gte: new Date(Date.now() - 60000) } // Last minute
      }).limit(10);

      for (const portfolio of recentPortfolios) {
        const event: PortfolioEvent = {
          userId: portfolio.userId,
          eventType: 'updated',
          totalValue: portfolio.metrics?.totalValue || 0,
          positions: portfolio.positions.map(pos => ({
            token: pos.token.symbol,
            amount: pos.amount,
            value: pos.value,
            allocation: pos.allocation
          })),
          riskScore: portfolio.metrics?.riskScore || 0
        };

        await this.processPortfolioEvent(event);
      }

    } catch (error) {
      this.logger.error('Failed to index portfolio events', error);
    }
  }

  /**
   * Index trade events
   */
  private async indexTradeEvents(): Promise<void> {
    try {
      // Get recent transactions
      const recentTrades = await Transaction.find({
        createdAt: { $gte: new Date(Date.now() - 60000) } // Last minute
      }).limit(10);

      for (const trade of recentTrades) {
        const indexedEvent: IndexedEvent = {
          id: trade._id.toString(),
          type: 'trade',
          userId: trade.userId,
          blockNumber: Math.floor(Math.random() * 1000000), // Mock block number
          transactionHash: trade.transactionHash || '0x' + Math.random().toString(16).substr(2, 64),
          timestamp: trade.createdAt,
          data: {
            type: trade.type,
            tokenIn: trade.tokenIn,
            tokenOut: trade.tokenOut,
            amountIn: trade.amountIn,
            amountOut: trade.amountOut,
            status: trade.status
          }
        };

        await this.processTradeEvent(indexedEvent);
      }

    } catch (error) {
      this.logger.error('Failed to index trade events', error);
    }
  }

  /**
   * Index market events (simulated)
   */
  private async indexMarketEvents(): Promise<void> {
    try {
      // Simulate market data updates
      const marketEvent = {
        type: 'market_update',
        timestamp: new Date(),
        data: {
          totalMarketCap: 2500000000000 + (Math.random() - 0.5) * 100000000000,
          totalVolume24h: 50000000000 + (Math.random() - 0.5) * 10000000000,
          btcDominance: 42 + (Math.random() - 0.5) * 2,
          fearGreedIndex: 50 + (Math.random() - 0.5) * 20,
          topGainers: [
            { symbol: 'MON', change: 15.5 + Math.random() * 10 },
            { symbol: 'ETH', change: 8.2 + Math.random() * 5 },
            { symbol: 'BTC', change: 3.1 + Math.random() * 3 }
          ]
        }
      };

      // Emit to all connected clients
      this.socketService.emitToChannel('market_data', 'market_update', marketEvent.data);
      
      this.logger.debug('Market event indexed and broadcasted');

    } catch (error) {
      this.logger.error('Failed to index market events', error);
    }
  }

  /**
   * Index permission events
   */
  private async indexPermissionEvents(): Promise<void> {
    try {
      // Simulate permission monitoring
      // In production, this would monitor smart contract events
      
      const permissionEvent = {
        type: 'permission_check',
        timestamp: new Date(),
        data: {
          autoRevokeChecks: Math.floor(Math.random() * 10),
          activePermissions: Math.floor(Math.random() * 50) + 100,
          riskAlerts: Math.floor(Math.random() * 3)
        }
      };

      this.logger.debug('Permission events indexed', permissionEvent);

    } catch (error) {
      this.logger.error('Failed to index permission events', error);
    }
  }

  /**
   * Process portfolio event
   */
  private async processPortfolioEvent(event: PortfolioEvent): Promise<void> {
    try {
      // Emit real-time update to user
      this.socketService.emitToUser(event.userId, 'portfolio_update', {
        userId: event.userId,
        totalValue: event.totalValue,
        pnl: this.calculatePnL(event),
        positions: event.positions,
        riskScore: event.riskScore,
        lastUpdated: new Date().toISOString()
      });

      // Log the event
      this.logger.info(`📊 Portfolio ${event.eventType}`, {
        userId: event.userId,
        totalValue: event.totalValue,
        positionCount: event.positions.length
      });

    } catch (error) {
      this.logger.error('Failed to process portfolio event', error);
    }
  }

  /**
   * Process trade event
   */
  private async processTradeEvent(event: IndexedEvent): Promise<void> {
    try {
      // Emit real-time update to user
      if (event.userId) {
        this.socketService.emitToUser(event.userId, 'trade_update', {
          tradeId: event.id,
          type: event.data.type,
          status: event.data.status,
          tokenIn: event.data.tokenIn,
          tokenOut: event.data.tokenOut,
          amountIn: event.data.amountIn,
          amountOut: event.data.amountOut,
          timestamp: event.timestamp
        });
      }

      // Log the event
      this.logger.info(`💱 Trade ${event.data.status}`, {
        userId: event.userId,
        type: event.data.type,
        tokenIn: event.data.tokenIn,
        tokenOut: event.data.tokenOut
      });

    } catch (error) {
      this.logger.error('Failed to process trade event', error);
    }
  }

  /**
   * Calculate PnL for portfolio
   */
  private calculatePnL(event: PortfolioEvent): number {
    // Simple PnL calculation for demo
    const baseValue = event.totalValue * 0.95; // Assume 5% gain
    return event.totalValue - baseValue;
  }

  /**
   * Get indexer statistics
   */
  public getIndexerStats(): {
    isIndexing: boolean;
    eventsProcessed: number;
    lastIndexedBlock: number;
    uptime: number;
  } {
    return {
      isIndexing: this.isIndexing,
      eventsProcessed: Math.floor(Math.random() * 1000) + 500, // Mock data
      lastIndexedBlock: Math.floor(Math.random() * 100000) + 19000000,
      uptime: process.uptime()
    };
  }

  /**
   * Manually trigger indexing for demo
   */
  public async triggerManualIndex(): Promise<void> {
    this.logger.info('🔍 Manual indexing triggered');
    await this.indexLatestEvents();
  }
}
