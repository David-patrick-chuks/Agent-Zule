import { Request, Response } from 'express';
import { Logger } from '../utils/Logger';
import { Transaction } from '../models/Transaction';
import { Recommendation } from '../models/Recommendation';
import { Permission } from '../models/Permission';

export class ExecutionController {
  private logger = Logger.getInstance();

  /**
   * Execute a trade
   */
  public async executeTrade(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const {
        type,
        tokenIn,
        tokenOut,
        amountIn,
        amountOutMin,
        slippage,
        deadline,
        gasPrice,
        gasLimit
      } = req.body;

      this.logger.logApiRequest('POST', '/api/execute/trade', 200, 0, { userId, type, tokenIn, tokenOut });

      // Validate required fields
      if (!type || !tokenIn || !amountIn) {
        res.status(400).json({
          success: false,
          message: 'Missing required fields: type, tokenIn, amountIn'
        });
        return;
      }

      // Check permissions
      const hasPermission = await this.checkTradePermission(userId, type, tokenIn, parseFloat(amountIn));
      if (!hasPermission) {
        res.status(403).json({
          success: false,
          message: 'Insufficient permissions for this trade'
        });
        return;
      }

      // Create transaction record
      const transaction = new Transaction({
        userId,
        agentId: 'agent-zule',
        type: type as any,
        status: 'pending',
        blockchain: 'monad',
        fromAddress: req.body.fromAddress || '',
        toAddress: req.body.toAddress,
        amount: amountIn,
        tokenAddress: tokenIn,
        tokenSymbol: this.getTokenSymbol(tokenIn),
        gasPrice: gasPrice || '20000000000', // 20 gwei
        gasLimit: gasLimit || '300000',
        metadata: {
          tokenOut,
          amountOutMin,
          slippage: slippage || 0.5,
          deadline: deadline || Math.floor(Date.now() / 1000) + 1800, // 30 minutes
          executionType: 'manual'
        }
      });

      await transaction.save();

      // Simulate trade execution (in production, this would interact with actual contracts)
      const executionResult = await this.simulateTradeExecution(transaction);

      // Update transaction status
      transaction.status = executionResult.success ? 'completed' : 'failed';
      transaction.transactionHash = executionResult.transactionHash;
      transaction.gasUsed = executionResult.gasUsed;
      transaction.fee = executionResult.fee;
      transaction.error = executionResult.error;
      transaction.executedAt = new Date();

      await transaction.save();

      this.logger.logTransaction(transaction._id.toString(), 'executed', {
        userId,
        type,
        success: executionResult.success,
        transactionHash: executionResult.transactionHash
      });

      res.json({
        success: executionResult.success,
        message: executionResult.success ? 'Trade executed successfully' : 'Trade execution failed',
        data: {
          transactionId: transaction._id,
          transactionHash: executionResult.transactionHash,
          status: transaction.status,
          gasUsed: executionResult.gasUsed,
          fee: executionResult.fee,
          executedAt: transaction.executedAt
        }
      });

    } catch (error) {
      this.logger.error('Failed to execute trade', error, { userId: req.params.userId });
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Execute approved recommendation
   */
  public async executeRecommendation(req: Request, res: Response): Promise<void> {
    try {
      const { recommendationId } = req.params;
      const { userConfirmation = false } = req.body;

      this.logger.logApiRequest('POST', '/api/execute/recommendation', 200, 0, { recommendationId, userConfirmation });

      // Get recommendation
      const recommendation = await Recommendation.findById(recommendationId);
      if (!recommendation) {
        res.status(404).json({
          success: false,
          message: 'Recommendation not found'
        });
        return;
      }

      if (recommendation.status !== 'approved') {
        res.status(400).json({
          success: false,
          message: 'Recommendation is not approved'
        });
        return;
      }

      // Check if user confirmation is required
      if (recommendation.details.requiresConfirmation && !userConfirmation) {
        res.status(400).json({
          success: false,
          message: 'User confirmation required for this recommendation'
        });
        return;
      }

      // Execute based on recommendation type
      let executionResult;
      switch (recommendation.type) {
        case 'rebalance':
          executionResult = await this.executeRebalance(recommendation);
          break;
        case 'yield_optimize':
          executionResult = await this.executeYieldOptimization(recommendation);
          break;
        case 'dca':
          executionResult = await this.executeDCA(recommendation);
          break;
        case 'risk_adjust':
          executionResult = await this.executeRiskAdjustment(recommendation);
          break;
        case 'cross_chain_opportunity':
          executionResult = await this.executeCrossChain(recommendation);
          break;
        default:
          throw new Error(`Unknown recommendation type: ${recommendation.type}`);
      }

      // Update recommendation status
      recommendation.status = executionResult.success ? 'executed' : 'failed';
      recommendation.executedAt = executionResult.success ? new Date() : undefined;
      await recommendation.save();

      // Create transaction record
      if (executionResult.transactionHash) {
        const transaction = new Transaction({
          userId: recommendation.userId,
          agentId: 'agent-zule',
          type: this.mapRecommendationTypeToTransactionType(recommendation.type),
          status: executionResult.success ? 'completed' : 'failed',
          blockchain: 'monad',
          transactionHash: executionResult.transactionHash,
          fromAddress: executionResult.fromAddress || '',
          toAddress: executionResult.toAddress,
          amount: executionResult.amount || '0',
          tokenAddress: executionResult.tokenAddress || '',
          tokenSymbol: executionResult.tokenSymbol || '',
          gasUsed: executionResult.gasUsed,
          fee: executionResult.fee,
          error: executionResult.error,
          metadata: {
            recommendationId,
            executionType: 'ai_recommendation',
            details: recommendation.details
          }
        });

        await transaction.save();
      }

      this.logger.logRecommendation(recommendationId, 'executed', {
        userId: recommendation.userId,
        type: recommendation.type,
        success: executionResult.success
      });

      res.json({
        success: executionResult.success,
        message: executionResult.success ? 'Recommendation executed successfully' : 'Recommendation execution failed',
        data: {
          recommendationId,
          status: recommendation.status,
          transactionHash: executionResult.transactionHash,
          executedAt: recommendation.executedAt,
          error: executionResult.error
        }
      });

    } catch (error) {
      this.logger.error('Failed to execute recommendation', error, { recommendationId: req.params.recommendationId });
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get execution history
   */
  public async getExecutionHistory(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const { type, status, limit = 50, offset = 0 } = req.query;

      this.logger.logApiRequest('GET', '/api/execute/history', 200, 0, { userId, type, status });

      // Build query
      const query: any = { userId };
      if (type) query.type = type;
      if (status) query.status = status;

      const transactions = await Transaction.find(query)
        .sort({ executedAt: -1 })
        .limit(parseInt(limit as string))
        .skip(parseInt(offset as string));

      res.json({
        success: true,
        data: {
          transactions,
          count: transactions.length,
          pagination: {
            limit: parseInt(limit as string),
            offset: parseInt(offset as string),
            hasMore: transactions.length === parseInt(limit as string)
          }
        }
      });

    } catch (error) {
      this.logger.error('Failed to get execution history', error, { userId: req.params.userId });
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get execution statistics
   */
  public async getExecutionStats(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const { timeframe = '30d' } = req.query;

      this.logger.logApiRequest('GET', '/api/execute/stats', 200, 0, { userId, timeframe });

      // Calculate timeframe
      const days = parseInt(timeframe as string.replace('d', ''));
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      // Get statistics
      const stats = await Transaction.aggregate([
        {
          $match: {
            userId,
            executedAt: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: null,
            totalTransactions: { $sum: 1 },
            completedTransactions: {
              $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
            },
            failedTransactions: {
              $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
            },
            totalGasUsed: { $sum: { $toDouble: '$gasUsed' } },
            totalFees: { $sum: { $toDouble: '$fee' } },
            byType: {
              $push: {
                type: '$type',
                status: '$status',
                gasUsed: { $toDouble: '$gasUsed' },
                fee: { $toDouble: '$fee' }
              }
            }
          }
        }
      ]);

      const result = stats[0] || {
        totalTransactions: 0,
        completedTransactions: 0,
        failedTransactions: 0,
        totalGasUsed: 0,
        totalFees: 0,
        byType: []
      };

      // Calculate additional metrics
      const successRate = result.totalTransactions > 0 ? 
        (result.completedTransactions / result.totalTransactions) * 100 : 0;
      const averageGasUsed = result.completedTransactions > 0 ? 
        result.totalGasUsed / result.completedTransactions : 0;
      const averageFee = result.completedTransactions > 0 ? 
        result.totalFees / result.completedTransactions : 0;

      res.json({
        success: true,
        data: {
          ...result,
          successRate,
          averageGasUsed,
          averageFee,
          timeframe,
          generatedAt: new Date()
        }
      });

    } catch (error) {
      this.logger.error('Failed to get execution stats', error, { userId: req.params.userId });
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Cancel pending execution
   */
  public async cancelExecution(req: Request, res: Response): Promise<void> {
    try {
      const { transactionId } = req.params;
      const { reason } = req.body;

      this.logger.logApiRequest('POST', '/api/execute/cancel', 200, 0, { transactionId, reason });

      const transaction = await Transaction.findById(transactionId);
      if (!transaction) {
        res.status(404).json({
          success: false,
          message: 'Transaction not found'
        });
        return;
      }

      if (transaction.status !== 'pending') {
        res.status(400).json({
          success: false,
          message: 'Transaction is not in pending status'
        });
        return;
      }

      // Update transaction status
      transaction.status = 'failed';
      transaction.error = reason || 'Transaction cancelled by user';
      await transaction.save();

      this.logger.logTransaction(transactionId, 'cancelled', {
        userId: transaction.userId,
        reason
      });

      res.json({
        success: true,
        message: 'Execution cancelled successfully',
        data: {
          transactionId,
          status: transaction.status,
          cancelledAt: new Date()
        }
      });

    } catch (error) {
      this.logger.error('Failed to cancel execution', error, { transactionId: req.params.transactionId });
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Private helper methods
  private async checkTradePermission(
    userId: string,
    type: string,
    token: string,
    amount: number
  ): Promise<boolean> {
    try {
      const permissions = await Permission.find({
        userId,
        status: 'active',
        type: 'trade_execution'
      });

      for (const permission of permissions) {
        // Check token scope
        if (permission.scope.tokens.length > 0 && 
            !permission.scope.tokens.includes(token)) continue;

        // Check amount limits
        if (amount > parseFloat(permission.scope.maxAmount)) continue;
        if (amount > permission.scope.maxPercentage * 1000000) continue; // Assuming portfolio value

        return true;
      }

      return false;
    } catch (error) {
      this.logger.error('Failed to check trade permission', error);
      return false;
    }
  }

  private getTokenSymbol(tokenAddress: string): string {
    // In production, this would query token metadata
    const symbols: Record<string, string> = {
      '0x...ETH': 'ETH',
      '0x...USDC': 'USDC',
      '0x...USDT': 'USDT'
    };
    return symbols[tokenAddress] || 'UNKNOWN';
  }

  private async simulateTradeExecution(transaction: any): Promise<{
    success: boolean;
    transactionHash?: string;
    gasUsed?: string;
    fee?: string;
    error?: string;
  }> {
    try {
      // Simulate execution delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Simulate success/failure (90% success rate)
      const success = Math.random() > 0.1;

      if (success) {
        const transactionHash = `0x${Math.random().toString(16).substring(2, 66)}`;
        const gasUsed = (Math.random() * 200000 + 100000).toString();
        const gasPrice = parseFloat(transaction.gasPrice);
        const fee = (parseFloat(gasUsed) * gasPrice).toString();

        return {
          success: true,
          transactionHash,
          gasUsed,
          fee
        };
      } else {
        return {
          success: false,
          error: 'Simulated execution failure'
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async executeRebalance(recommendation: any): Promise<any> {
    // Simulate rebalance execution
    return {
      success: true,
      transactionHash: `0x${Math.random().toString(16).substring(2, 66)}`,
      gasUsed: '250000',
      fee: '0.005',
      fromAddress: '0x...',
      toAddress: '0x...',
      amount: '1000',
      tokenAddress: recommendation.details.token,
      tokenSymbol: 'USDC'
    };
  }

  private async executeYieldOptimization(recommendation: any): Promise<any> {
    // Simulate yield optimization execution
    return {
      success: true,
      transactionHash: `0x${Math.random().toString(16).substring(2, 66)}`,
      gasUsed: '300000',
      fee: '0.006',
      fromAddress: '0x...',
      toAddress: '0x...',
      amount: '500',
      tokenAddress: recommendation.details.token,
      tokenSymbol: 'USDC'
    };
  }

  private async executeDCA(recommendation: any): Promise<any> {
    // Simulate DCA execution
    return {
      success: true,
      transactionHash: `0x${Math.random().toString(16).substring(2, 66)}`,
      gasUsed: '200000',
      fee: '0.004',
      fromAddress: '0x...',
      toAddress: '0x...',
      amount: '100',
      tokenAddress: recommendation.details.token,
      tokenSymbol: 'ETH'
    };
  }

  private async executeRiskAdjustment(recommendation: any): Promise<any> {
    // Simulate risk adjustment execution
    return {
      success: true,
      transactionHash: `0x${Math.random().toString(16).substring(2, 66)}`,
      gasUsed: '180000',
      fee: '0.0036',
      fromAddress: '0x...',
      toAddress: '0x...',
      amount: '200',
      tokenAddress: recommendation.details.token,
      tokenSymbol: 'USDC'
    };
  }

  private async executeCrossChain(recommendation: any): Promise<any> {
    // Simulate cross-chain execution
    return {
      success: true,
      transactionHash: `0x${Math.random().toString(16).substring(2, 66)}`,
      gasUsed: '400000',
      fee: '0.008',
      fromAddress: '0x...',
      toAddress: '0x...',
      amount: '1000',
      tokenAddress: recommendation.details.token,
      tokenSymbol: 'USDC'
    };
  }

  private mapRecommendationTypeToTransactionType(recommendationType: string): string {
    const mapping: Record<string, string> = {
      'rebalance': 'rebalance',
      'yield_optimize': 'yield_farm',
      'dca': 'dca_buy',
      'risk_adjust': 'swap',
      'cross_chain_opportunity': 'swap'
    };
    return mapping[recommendationType] || 'swap';
  }
}
