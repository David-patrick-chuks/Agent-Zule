import { ethers } from 'ethers';
import { TransactionType } from '../../models/Transaction';
import { PermissionRepository } from '../../repositories/PermissionRepository';
import { TransactionRepository } from '../../repositories/TransactionRepository';
import { TransactionStatus } from '../../types/Common';
import { Logger } from '../../utils/Logger';
import { ContractService } from '../blockchain/ContractService';
import { MonadClient } from '../blockchain/MonadClient';

export interface TradeOrder {
  id: string;
  userId: string;
  type: 'market' | 'limit' | 'stop';
  side: 'buy' | 'sell';
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  amountOutMin?: string;
  price?: string;
  slippage: number;
  gasPrice?: string;
  gasLimit?: string;
  deadline: number;
  status: 'pending' | 'submitted' | 'confirmed' | 'failed' | 'cancelled';
  createdAt: Date;
  executedAt?: Date;
  transactionHash?: string;
  error?: string;
}

export interface ExecutionResult {
  success: boolean;
  transactionHash?: string;
  gasUsed?: string;
  fee?: string;
  error?: string;
  executionTime?: number;
}

export interface TradeParams {
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  amountOutMin: string;
  slippage: number;
  deadline: number;
  recipient: string;
}

export class TradeExecutionService {
  private static instance: TradeExecutionService;
  private monadClient: MonadClient;
  private contractService: ContractService;
  private transactionRepository: TransactionRepository;
  private permissionRepository: PermissionRepository;
  private logger = Logger.getInstance();
  private pendingOrders: Map<string, TradeOrder> = new Map();

  private constructor() {
    this.monadClient = MonadClient.getInstance();
    this.contractService = ContractService.getInstance();
    this.transactionRepository = new TransactionRepository();
    this.permissionRepository = new PermissionRepository();
  }

  public static getInstance(): TradeExecutionService {
    if (!TradeExecutionService.instance) {
      TradeExecutionService.instance = new TradeExecutionService();
    }
    return TradeExecutionService.instance;
  }

  /**
   * Execute trade order
   */
  public async executeTrade(
    order: TradeOrder,
    wallet: ethers.Wallet
  ): Promise<ExecutionResult> {
    try {
      this.logger.logEnvio('TradeExecutionService', 'execute_trade', {
        orderId: order.id,
        userId: order.userId,
        type: order.type,
        side: order.side
      });

      // Check permissions
      const hasPermission = await this.checkTradePermission(
        order.userId,
        order.side,
        order.tokenIn,
        parseFloat(order.amountIn)
      );

      if (!hasPermission.hasPermission) {
        return {
          success: false,
          error: `Permission denied: ${hasPermission.reason}`
        };
      }

      // Update order status
      order.status = 'submitted';
      this.pendingOrders.set(order.id, order);

      // Execute based on order type
      let result: ExecutionResult;
      switch (order.type) {
        case 'market':
          result = await this.executeMarketOrder(order, wallet);
          break;
        case 'limit':
          result = await this.executeLimitOrder(order, wallet);
          break;
        case 'stop':
          result = await this.executeStopOrder(order, wallet);
          break;
        default:
          throw new Error(`Unknown order type: ${order.type}`);
      }

      // Update order with result
      if (result.success) {
        order.status = 'confirmed';
        order.transactionHash = result.transactionHash;
        order.executedAt = new Date();
      } else {
        order.status = 'failed';
        order.error = result.error;
      }

      // Save transaction to database
      await this.saveTransaction(order, result);

      this.logger.logEnvio('TradeExecutionService', 'trade_executed', {
        orderId: order.id,
        success: result.success,
        transactionHash: result.transactionHash
      });

      return result;

    } catch (error) {
      this.logger.error('Failed to execute trade', error, { orderId: order.id });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Create market order
   */
  public async createMarketOrder(
    userId: string,
    side: 'buy' | 'sell',
    tokenIn: string,
    tokenOut: string,
    amountIn: string,
    slippage: number = 0.5,
    deadline?: number
  ): Promise<TradeOrder> {
    try {
      this.logger.logEnvio('TradeExecutionService', 'create_market_order', {
        userId,
        side,
        tokenIn,
        tokenOut,
        amountIn
      });

      const order: TradeOrder = {
        id: `order_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        userId,
        type: 'market',
        side,
        tokenIn,
        tokenOut,
        amountIn,
        slippage,
        deadline: deadline || Math.floor(Date.now() / 1000) + 1800, // 30 minutes
        status: 'pending',
        createdAt: new Date()
      };

      return order;

    } catch (error) {
      this.logger.error('Failed to create market order', error, { userId });
      throw error;
    }
  }

  /**
   * Create limit order
   */
  public async createLimitOrder(
    userId: string,
    side: 'buy' | 'sell',
    tokenIn: string,
    tokenOut: string,
    amountIn: string,
    price: string,
    slippage: number = 0.5,
    deadline?: number
  ): Promise<TradeOrder> {
    try {
      this.logger.logEnvio('TradeExecutionService', 'create_limit_order', {
        userId,
        side,
        tokenIn,
        tokenOut,
        amountIn,
        price
      });

      const order: TradeOrder = {
        id: `order_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        userId,
        type: 'limit',
        side,
        tokenIn,
        tokenOut,
        amountIn,
        price,
        slippage,
        deadline: deadline || Math.floor(Date.now() / 1000) + 3600, // 1 hour
        status: 'pending',
        createdAt: new Date()
      };

      return order;

    } catch (error) {
      this.logger.error('Failed to create limit order', error, { userId });
      throw error;
    }
  }

  /**
   * Cancel order
   */
  public async cancelOrder(orderId: string, userId: string): Promise<boolean> {
    try {
      this.logger.logEnvio('TradeExecutionService', 'cancel_order', { orderId, userId });

      const order = this.pendingOrders.get(orderId);
      if (!order || order.userId !== userId) {
        throw new Error('Order not found or unauthorized');
      }

      if (order.status !== 'pending' && order.status !== 'submitted') {
        throw new Error('Order cannot be cancelled');
      }

      order.status = 'cancelled';
      this.pendingOrders.delete(orderId);

      this.logger.logEnvio('TradeExecutionService', 'order_cancelled', { orderId });
      return true;

    } catch (error) {
      this.logger.error('Failed to cancel order', error, { orderId });
      throw error;
    }
  }

  /**
   * Get order status
   */
  public async getOrderStatus(orderId: string): Promise<TradeOrder | null> {
    try {
      return this.pendingOrders.get(orderId) || null;
    } catch (error) {
      this.logger.error('Failed to get order status', error, { orderId });
      return null;
    }
  }

  /**
   * Get user orders
   */
  public async getUserOrders(
    userId: string,
    status?: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<{ orders: TradeOrder[]; total: number }> {
    try {
      this.logger.logEnvio('TradeExecutionService', 'get_user_orders', { userId, status, limit, offset });

      let orders = Array.from(this.pendingOrders.values())
        .filter(order => order.userId === userId);

      if (status) {
        orders = orders.filter(order => order.status === status);
      }

      const total = orders.length;
      orders = orders
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(offset, offset + limit);

      return { orders, total };

    } catch (error) {
      this.logger.error('Failed to get user orders', error, { userId });
      throw error;
    }
  }

  /**
   * Get execution statistics
   */
  public async getExecutionStats(
    userId?: string,
    timeframe?: '1d' | '7d' | '30d'
  ): Promise<{
    totalOrders: number;
    executedOrders: number;
    cancelledOrders: number;
    failedOrders: number;
    successRate: number;
    averageExecutionTime: number;
    totalVolume: number;
    totalFees: number;
  }> {
    try {
      this.logger.logEnvio('TradeExecutionService', 'get_execution_stats', { userId, timeframe });

      // Get stats from database
      const stats = await this.transactionRepository.getStats(userId, timeframe);

      return {
        totalOrders: stats.totalTransactions,
        executedOrders: stats.completedTransactions,
        cancelledOrders: 0, // Would need to track cancellations
        failedOrders: stats.failedTransactions,
        successRate: stats.successRate,
        averageExecutionTime: 0, // Would need to calculate from execution times
        totalVolume: stats.totalVolume,
        totalFees: stats.totalFees
      };

    } catch (error) {
      this.logger.error('Failed to get execution stats', error, { userId });
      throw error;
    }
  }

  // Private helper methods
  private async executeMarketOrder(
    order: TradeOrder,
    wallet: ethers.Wallet
  ): Promise<ExecutionResult> {
    try {
      const startTime = Date.now();

      // Get current price and calculate minimum output
      const currentPrice = await this.getCurrentPrice(order.tokenIn, order.tokenOut);
      const amountOutMin = this.calculateAmountOutMin(
        order.amountIn,
        currentPrice,
        order.slippage
      );

      // Execute swap
      const result = await this.executeSwap({
        tokenIn: order.tokenIn,
        tokenOut: order.tokenOut,
        amountIn: order.amountIn,
        amountOutMin: amountOutMin.toString(),
        slippage: order.slippage,
        deadline: order.deadline,
        recipient: wallet.address
      }, wallet);

      const executionTime = Date.now() - startTime;

      return {
        ...result,
        executionTime
      };

    } catch (error) {
      this.logger.error('Failed to execute market order', error, { orderId: order.id });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Market order execution failed'
      };
    }
  }

  private async executeLimitOrder(
    order: TradeOrder,
    wallet: ethers.Wallet
  ): Promise<ExecutionResult> {
    try {
      // Check if price condition is met
      const currentPrice = await this.getCurrentPrice(order.tokenIn, order.tokenOut);
      const targetPrice = parseFloat(order.price!);

      if (order.side === 'buy' && currentPrice > targetPrice) {
        return {
          success: false,
          error: 'Price condition not met for buy order'
        };
      }

      if (order.side === 'sell' && currentPrice < targetPrice) {
        return {
          success: false,
          error: 'Price condition not met for sell order'
        };
      }

      // Execute as market order
      return await this.executeMarketOrder(order, wallet);

    } catch (error) {
      this.logger.error('Failed to execute limit order', error, { orderId: order.id });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Limit order execution failed'
      };
    }
  }

  private async executeStopOrder(
    order: TradeOrder,
    wallet: ethers.Wallet
  ): Promise<ExecutionResult> {
    try {
      // Check if stop condition is met
      const currentPrice = await this.getCurrentPrice(order.tokenIn, order.tokenOut);
      const stopPrice = parseFloat(order.price!);

      if (order.side === 'buy' && currentPrice < stopPrice) {
        return {
          success: false,
          error: 'Stop condition not met for buy order'
        };
      }

      if (order.side === 'sell' && currentPrice > stopPrice) {
        return {
          success: false,
          error: 'Stop condition not met for sell order'
        };
      }

      // Execute as market order
      return await this.executeMarketOrder(order, wallet);

    } catch (error) {
      this.logger.error('Failed to execute stop order', error, { orderId: order.id });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Stop order execution failed'
      };
    }
  }

  private async executeSwap(
    params: TradeParams,
    wallet: ethers.Wallet
  ): Promise<ExecutionResult> {
    try {
      // This would interact with actual DEX contracts
      // For now, simulate the swap
      const gasEstimate = await this.monadClient.estimateGas({
        to: '0x...', // DEX contract address
        from: wallet.address,
        value: '0',
        data: '0x...' // Swap function call data
      });

      const gasPrice = await this.monadClient.getGasPrice();
      const gasLimit = (BigInt(gasEstimate) * 120n / 100n).toString(); // 20% buffer

      // Simulate transaction
      const transactionHash = `0x${Math.random().toString(16).substring(2, 66)}`;
      const gasUsed = gasEstimate;
      const fee = (BigInt(gasUsed) * BigInt(gasPrice)).toString();

      return {
        success: true,
        transactionHash,
        gasUsed,
        fee
      };

    } catch (error) {
      this.logger.error('Failed to execute swap', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Swap execution failed'
      };
    }
  }

  private async getCurrentPrice(tokenIn: string, tokenOut: string): Promise<number> {
    // This would get actual price from DEX or price oracle
    // For now, return mock price
    return 1.0;
  }

  private calculateAmountOutMin(
    amountIn: string,
    price: number,
    slippage: number
  ): number {
    const amountInNum = parseFloat(amountIn);
    const expectedOut = amountInNum * price;
    const slippageAmount = expectedOut * (slippage / 100);
    return expectedOut - slippageAmount;
  }

  private async checkTradePermission(
    userId: string,
    side: string,
    token: string,
    amount: number
  ): Promise<{ hasPermission: boolean; reason?: string }> {
    try {
      const permission = await this.permissionRepository.checkPermission(
        userId,
        'trade_execution',
        token,
        amount
      );

      return permission;

      
    } catch (error) {
      this.logger.error('Failed to check trade permission', error, { userId });
      return {
        hasPermission: false,
        reason: 'Permission check failed'
      };
    }
  }

  private async saveTransaction(
    order: TradeOrder,
    result: ExecutionResult
  ): Promise<void> {
    try {
      if (result.transactionHash) {
        await this.transactionRepository.create({
          userId: order.userId,
          type: TransactionType.SWAP,
          status: result.success ? TransactionStatus.COMPLETED : TransactionStatus.FAILED,
          transactionHash: result.transactionHash,
          amount: order.amountIn,
          tokenAddress: order.tokenIn,
          gasUsed: result.gasUsed,
          fee: result.fee,
          metadata: {
            priority: 'medium',
            tags: ['trade', 'execution'],
            description: `Execute ${order.type} order for ${order.tokenIn}/${order.tokenOut}`,
            source: 'ai_recommendation',
            relatedTransactions: [],
            orderId: order.id,
            tokenIn: order.tokenIn,
            tokenOut: order.tokenOut
          }
        });
      }

    } catch (error) {
      this.logger.error('Failed to save transaction', error, { orderId: order.id });
    }
  }

  private getTokenSymbol(tokenAddress: string): string {
    // This would get actual token symbol from contract or registry
    const symbols: Record<string, string> = {
      '0x...USDC': 'USDC',
      '0x...USDT': 'USDT',
      '0x...ETH': 'ETH'
    };
    return symbols[tokenAddress] || 'UNKNOWN';
  }
}
