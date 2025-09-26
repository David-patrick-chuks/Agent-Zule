import { Transaction, ITransaction } from '../models/Transaction';
import { Logger } from '../utils/Logger';

export class TransactionRepository {
  private logger = Logger.getInstance();

  /**
   * Create a new transaction
   */
  public async create(transactionData: Partial<ITransaction>): Promise<ITransaction> {
    try {
      this.logger.logDatabase('create', 'transactions', 0, { userId: transactionData.userId, type: transactionData.type });

      const transaction = new Transaction(transactionData);
      await transaction.save();

      this.logger.logDatabase('create', 'transactions', 0, { transactionId: transaction._id, userId: transaction.userId });
      return transaction;

    } catch (error) {
      this.logger.error('Failed to create transaction', error, { userId: transactionData.userId });
      throw error;
    }
  }

  /**
   * Find transaction by ID
   */
  public async findById(transactionId: string): Promise<ITransaction | null> {
    try {
      this.logger.logDatabase('findById', 'transactions', 0, { transactionId });

      const transaction = await Transaction.findById(transactionId);
      return transaction;

    } catch (error) {
      this.logger.error('Failed to find transaction by ID', error, { transactionId });
      throw error;
    }
  }

  /**
   * Find transaction by hash
   */
  public async findByHash(transactionHash: string): Promise<ITransaction | null> {
    try {
      this.logger.logDatabase('findOne', 'transactions', 0, { transactionHash });

      const transaction = await Transaction.findOne({ transactionHash });
      return transaction;

    } catch (error) {
      this.logger.error('Failed to find transaction by hash', error, { transactionHash });
      throw error;
    }
  }

  /**
   * Find transactions by user ID
   */
  public async findByUserId(
    userId: string,
    limit: number = 50,
    offset: number = 0,
    filters?: Partial<ITransaction>
  ): Promise<{ transactions: ITransaction[]; total: number }> {
    try {
      this.logger.logDatabase('find', 'transactions', 0, { userId, limit, offset, filters });

      const query = { userId, ...filters };
      const [transactions, total] = await Promise.all([
        Transaction.find(query)
          .sort({ executedAt: -1 })
          .limit(limit)
          .skip(offset),
        Transaction.countDocuments(query)
      ]);

      return { transactions, total };

    } catch (error) {
      this.logger.error('Failed to find transactions by user ID', error, { userId });
      throw error;
    }
  }

  /**
   * Find transactions by agent ID
   */
  public async findByAgentId(
    agentId: string,
    limit: number = 50,
    offset: number = 0,
    filters?: Partial<ITransaction>
  ): Promise<{ transactions: ITransaction[]; total: number }> {
    try {
      this.logger.logDatabase('find', 'transactions', 0, { agentId, limit, offset, filters });

      const query = { agentId, ...filters };
      const [transactions, total] = await Promise.all([
        Transaction.find(query)
          .sort({ executedAt: -1 })
          .limit(limit)
          .skip(offset),
        Transaction.countDocuments(query)
      ]);

      return { transactions, total };

    } catch (error) {
      this.logger.error('Failed to find transactions by agent ID', error, { agentId });
      throw error;
    }
  }

  /**
   * Find transactions by type
   */
  public async findByType(
    type: ITransaction['type'],
    limit: number = 50,
    offset: number = 0,
    filters?: Partial<ITransaction>
  ): Promise<{ transactions: ITransaction[]; total: number }> {
    try {
      this.logger.logDatabase('find', 'transactions', 0, { type, limit, offset, filters });

      const query = { type, ...filters };
      const [transactions, total] = await Promise.all([
        Transaction.find(query)
          .sort({ executedAt: -1 })
          .limit(limit)
          .skip(offset),
        Transaction.countDocuments(query)
      ]);

      return { transactions, total };

    } catch (error) {
      this.logger.error('Failed to find transactions by type', error, { type });
      throw error;
    }
  }

  /**
   * Find transactions by status
   */
  public async findByStatus(
    status: ITransaction['status'],
    limit: number = 50,
    offset: number = 0,
    filters?: Partial<ITransaction>
  ): Promise<{ transactions: ITransaction[]; total: number }> {
    try {
      this.logger.logDatabase('find', 'transactions', 0, { status, limit, offset, filters });

      const query = { status, ...filters };
      const [transactions, total] = await Promise.all([
        Transaction.find(query)
          .sort({ executedAt: -1 })
          .limit(limit)
          .skip(offset),
        Transaction.countDocuments(query)
      ]);

      return { transactions, total };

    } catch (error) {
      this.logger.error('Failed to find transactions by status', error, { status });
      throw error;
    }
  }

  /**
   * Update transaction status
   */
  public async updateStatus(
    transactionId: string,
    status: ITransaction['status'],
    additionalData?: Partial<ITransaction>
  ): Promise<ITransaction | null> {
    try {
      this.logger.logDatabase('updateOne', 'transactions', 0, { transactionId, status });

      const updateData: any = { 
        status,
        updatedAt: new Date()
      };

      // Add additional data if provided
      if (additionalData) {
        Object.assign(updateData, additionalData);
      }

      const transaction = await Transaction.findByIdAndUpdate(
        transactionId,
        { $set: updateData },
        { new: true }
      );

      return transaction;

    } catch (error) {
      this.logger.error('Failed to update transaction status', error, { transactionId, status });
      throw error;
    }
  }

  /**
   * Update transaction hash and execution details
   */
  public async updateExecution(
    transactionId: string,
    transactionHash: string,
    gasUsed: string,
    fee: string,
    status: ITransaction['status'] = 'completed'
  ): Promise<ITransaction | null> {
    try {
      this.logger.logDatabase('updateOne', 'transactions', 0, { transactionId, transactionHash });

      const transaction = await Transaction.findByIdAndUpdate(
        transactionId,
        { 
          $set: { 
            transactionHash,
            gasUsed,
            fee,
            status,
            executedAt: new Date(),
            updatedAt: new Date()
          }
        },
        { new: true }
      );

      return transaction;

    } catch (error) {
      this.logger.error('Failed to update transaction execution', error, { transactionId });
      throw error;
    }
  }

  /**
   * Get transaction statistics
   */
  public async getStats(
    userId?: string,
    timeframe?: '1d' | '7d' | '30d' | '90d'
  ): Promise<{
    totalTransactions: number;
    completedTransactions: number;
    failedTransactions: number;
    pendingTransactions: number;
    totalVolume: number;
    totalFees: number;
    averageGasUsed: number;
    byType: Record<string, number>;
    byStatus: Record<string, number>;
    successRate: number;
  }> {
    try {
      this.logger.logDatabase('aggregate', 'transactions', 0, { userId, timeframe });

      // Calculate date filter
      let dateFilter = {};
      if (timeframe) {
        const days = parseInt(timeframe.replace('d', ''));
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        dateFilter = { executedAt: { $gte: startDate } };
      }

      const baseQuery = userId ? { userId, ...dateFilter } : dateFilter;

      const [
        totalTransactions,
        completedTransactions,
        failedTransactions,
        pendingTransactions,
        volumeStats,
        feeStats,
        gasStats,
        byType,
        byStatus
      ] = await Promise.all([
        Transaction.countDocuments(baseQuery),
        Transaction.countDocuments({ ...baseQuery, status: 'completed' }),
        Transaction.countDocuments({ ...baseQuery, status: 'failed' }),
        Transaction.countDocuments({ ...baseQuery, status: 'pending' }),
        Transaction.aggregate([
          { $match: baseQuery },
          { $group: { _id: null, total: { $sum: { $toDouble: '$amount' } } } }
        ]),
        Transaction.aggregate([
          { $match: baseQuery },
          { $group: { _id: null, total: { $sum: { $toDouble: '$fee' } } } }
        ]),
        Transaction.aggregate([
          { $match: { ...baseQuery, gasUsed: { $exists: true } } },
          { $group: { _id: null, avg: { $avg: { $toDouble: '$gasUsed' } } } }
        ]),
        Transaction.aggregate([
          { $match: baseQuery },
          { $group: { _id: '$type', count: { $sum: 1 } } }
        ]),
        Transaction.aggregate([
          { $match: baseQuery },
          { $group: { _id: '$status', count: { $sum: 1 } } }
        ])
      ]);

      const totalVolume = volumeStats[0]?.total || 0;
      const totalFees = feeStats[0]?.total || 0;
      const averageGasUsed = gasStats[0]?.avg || 0;
      const successRate = totalTransactions > 0 ? (completedTransactions / totalTransactions) * 100 : 0;

      return {
        totalTransactions,
        completedTransactions,
        failedTransactions,
        pendingTransactions,
        totalVolume,
        totalFees,
        averageGasUsed,
        byType: byType.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {} as Record<string, number>),
        byStatus: byStatus.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {} as Record<string, number>),
        successRate
      };

    } catch (error) {
      this.logger.error('Failed to get transaction stats', error, { userId, timeframe });
      throw error;
    }
  }

  /**
   * Get pending transactions
   */
  public async getPending(
    limit: number = 50,
    offset: number = 0
  ): Promise<{ transactions: ITransaction[]; total: number }> {
    try {
      this.logger.logDatabase('find', 'transactions', 0, { status: 'pending', limit, offset });

      const query = { status: 'pending' };
      const [transactions, total] = await Promise.all([
        Transaction.find(query)
          .sort({ createdAt: -1 })
          .limit(limit)
          .skip(offset),
        Transaction.countDocuments(query)
      ]);

      return { transactions, total };

    } catch (error) {
      this.logger.error('Failed to get pending transactions', error, { limit, offset });
      throw error;
    }
  }

  /**
   * Get failed transactions
   */
  public async getFailed(
    limit: number = 50,
    offset: number = 0
  ): Promise<{ transactions: ITransaction[]; total: number }> {
    try {
      this.logger.logDatabase('find', 'transactions', 0, { status: 'failed', limit, offset });

      const query = { status: 'failed' };
      const [transactions, total] = await Promise.all([
        Transaction.find(query)
          .sort({ executedAt: -1 })
          .limit(limit)
          .skip(offset),
        Transaction.countDocuments(query)
      ]);

      return { transactions, total };

    } catch (error) {
      this.logger.error('Failed to get failed transactions', error, { limit, offset });
      throw error;
    }
  }

  /**
   * Get transactions by date range
   */
  public async findByDateRange(
    startDate: Date,
    endDate: Date,
    limit: number = 50,
    offset: number = 0,
    filters?: Partial<ITransaction>
  ): Promise<{ transactions: ITransaction[]; total: number }> {
    try {
      this.logger.logDatabase('find', 'transactions', 0, { startDate, endDate, limit, offset, filters });

      const query = {
        executedAt: { $gte: startDate, $lte: endDate },
        ...filters
      };

      const [transactions, total] = await Promise.all([
        Transaction.find(query)
          .sort({ executedAt: -1 })
          .limit(limit)
          .skip(offset),
        Transaction.countDocuments(query)
      ]);

      return { transactions, total };

    } catch (error) {
      this.logger.error('Failed to find transactions by date range', error, { startDate, endDate });
      throw error;
    }
  }

  /**
   * Get transaction volume by token
   */
  public async getVolumeByToken(
    timeframe: '1d' | '7d' | '30d' = '7d'
  ): Promise<Array<{
    token: string;
    tokenSymbol: string;
    volume: number;
    transactionCount: number;
    averageAmount: number;
  }>> {
    try {
      this.logger.logDatabase('aggregate', 'transactions', 0, { timeframe });

      const days = parseInt(timeframe.replace('d', ''));
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const volumeStats = await Transaction.aggregate([
        {
          $match: {
            executedAt: { $gte: startDate },
            status: 'completed'
          }
        },
        {
          $group: {
            _id: '$tokenAddress',
            tokenSymbol: { $first: '$tokenSymbol' },
            volume: { $sum: { $toDouble: '$amount' } },
            transactionCount: { $sum: 1 },
            averageAmount: { $avg: { $toDouble: '$amount' } }
          }
        },
        {
          $sort: { volume: -1 }
        }
      ]);

      return volumeStats.map(stat => ({
        token: stat._id,
        tokenSymbol: stat.tokenSymbol,
        volume: stat.volume,
        transactionCount: stat.transactionCount,
        averageAmount: stat.averageAmount
      }));

    } catch (error) {
      this.logger.error('Failed to get volume by token', error, { timeframe });
      throw error;
    }
  }

  /**
   * Get transaction performance metrics
   */
  public async getPerformanceMetrics(
    userId: string,
    timeframe: '7d' | '30d' | '90d' = '30d'
  ): Promise<{
    totalExecuted: number;
    successRate: number;
    averageExecutionTime: number;
    totalVolume: number;
    totalFees: number;
    averageGasUsed: number;
    topTokens: Array<{ token: string; volume: number; count: number }>;
  }> {
    try {
      this.logger.logDatabase('aggregate', 'transactions', 0, { userId, timeframe });

      const days = parseInt(timeframe.replace('d', ''));
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const query = { userId, executedAt: { $gte: startDate } };

      const [
        totalExecuted,
        successRate,
        executionTimes,
        volumeStats,
        feeStats,
        gasStats,
        topTokens
      ] = await Promise.all([
        Transaction.countDocuments({ ...query, status: 'completed' }),
        Transaction.aggregate([
          { $match: query },
          { $group: { _id: null, rate: { $avg: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } } } }
        ]),
        Transaction.aggregate([
          { $match: { ...query, status: 'completed' } },
          { $project: { executionTime: { $subtract: ['$executedAt', '$createdAt'] } } },
          { $group: { _id: null, avg: { $avg: '$executionTime' } } }
        ]),
        Transaction.aggregate([
          { $match: { ...query, status: 'completed' } },
          { $group: { _id: null, total: { $sum: { $toDouble: '$amount' } } } }
        ]),
        Transaction.aggregate([
          { $match: { ...query, status: 'completed' } },
          { $group: { _id: null, total: { $sum: { $toDouble: '$fee' } } } }
        ]),
        Transaction.aggregate([
          { $match: { ...query, status: 'completed', gasUsed: { $exists: true } } },
          { $group: { _id: null, avg: { $avg: { $toDouble: '$gasUsed' } } } }
        ]),
        Transaction.aggregate([
          { $match: { ...query, status: 'completed' } },
          {
            $group: {
              _id: '$tokenAddress',
              volume: { $sum: { $toDouble: '$amount' } },
              count: { $sum: 1 }
            }
          },
          { $sort: { volume: -1 } },
          { $limit: 10 }
        ])
      ]);

      return {
        totalExecuted,
        successRate: (successRate[0]?.rate || 0) * 100,
        averageExecutionTime: executionTimes[0]?.avg || 0,
        totalVolume: volumeStats[0]?.total || 0,
        totalFees: feeStats[0]?.total || 0,
        averageGasUsed: gasStats[0]?.avg || 0,
        topTokens: topTokens.map(token => ({
          token: token._id,
          volume: token.volume,
          count: token.count
        }))
      };

    } catch (error) {
      this.logger.error('Failed to get transaction performance metrics', error, { userId, timeframe });
      throw error;
    }
  }

  /**
   * Delete transaction
   */
  public async delete(transactionId: string): Promise<boolean> {
    try {
      this.logger.logDatabase('deleteOne', 'transactions', 0, { transactionId });

      const result = await Transaction.findByIdAndDelete(transactionId);
      return !!result;

    } catch (error) {
      this.logger.error('Failed to delete transaction', error, { transactionId });
      throw error;
    }
  }
}
