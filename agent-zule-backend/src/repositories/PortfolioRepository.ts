import { Portfolio, IPortfolio } from '../models/Portfolio';
import { Logger } from '../utils/Logger';

export class PortfolioRepository {
  private logger = Logger.getInstance();

  /**
   * Create a new portfolio
   */
  public async create(portfolioData: Partial<IPortfolio>): Promise<IPortfolio> {
    try {
      this.logger.logDatabase('create', 'portfolios', 0, { userId: portfolioData.userId });

      const portfolio = new Portfolio(portfolioData);
      await portfolio.save();

      this.logger.logDatabase('create', 'portfolios', 0, { portfolioId: portfolio._id, userId: portfolio.userId });
      return portfolio;

    } catch (error) {
      this.logger.error('Failed to create portfolio', error, { userId: portfolioData.userId });
      throw error;
    }
  }

  /**
   * Find portfolio by user ID
   */
  public async findByUserId(userId: string): Promise<IPortfolio | null> {
    try {
      this.logger.logDatabase('findOne', 'portfolios', 0, { userId });

      const portfolio = await Portfolio.findOne({ userId });
      return portfolio;

    } catch (error) {
      this.logger.error('Failed to find portfolio by user ID', error, { userId });
      throw error;
    }
  }

  /**
   * Find portfolio by wallet address
   */
  public async findByWalletAddress(walletAddress: string): Promise<IPortfolio | null> {
    try {
      this.logger.logDatabase('findOne', 'portfolios', 0, { walletAddress });

      const portfolio = await Portfolio.findOne({ walletAddress });
      return portfolio;

    } catch (error) {
      this.logger.error('Failed to find portfolio by wallet address', error, { walletAddress });
      throw error;
    }
  }

  /**
   * Update portfolio positions
   */
  public async updatePositions(
    userId: string,
    positions: IPortfolio['positions']
  ): Promise<IPortfolio | null> {
    try {
      this.logger.logDatabase('updateOne', 'portfolios', 0, { userId, positionCount: positions.length });

      const portfolio = await Portfolio.findOneAndUpdate(
        { userId },
        { 
          $set: { 
            positions,
            updatedAt: new Date()
          }
        },
        { new: true }
      );

      return portfolio;

    } catch (error) {
      this.logger.error('Failed to update portfolio positions', error, { userId });
      throw error;
    }
  }

  /**
   * Update portfolio total value and risk score
   */
  public async updateMetrics(
    userId: string,
    totalValue: string,
    riskScore: number
  ): Promise<IPortfolio | null> {
    try {
      this.logger.logDatabase('updateOne', 'portfolios', 0, { userId, totalValue, riskScore });

      const portfolio = await Portfolio.findOneAndUpdate(
        { userId },
        { 
          $set: { 
            totalValue,
            riskScore,
            updatedAt: new Date()
          }
        },
        { new: true }
      );

      return portfolio;

    } catch (error) {
      this.logger.error('Failed to update portfolio metrics', error, { userId });
      throw error;
    }
  }

  /**
   * Update last rebalanced timestamp
   */
  public async updateLastRebalanced(userId: string): Promise<IPortfolio | null> {
    try {
      this.logger.logDatabase('updateOne', 'portfolios', 0, { userId });

      const portfolio = await Portfolio.findOneAndUpdate(
        { userId },
        { 
          $set: { 
            lastRebalanced: new Date(),
            updatedAt: new Date()
          }
        },
        { new: true }
      );

      return portfolio;

    } catch (error) {
      this.logger.error('Failed to update last rebalanced', error, { userId });
      throw error;
    }
  }

  /**
   * Get all portfolios with pagination
   */
  public async findAll(
    limit: number = 50,
    offset: number = 0,
    filters?: Partial<IPortfolio>
  ): Promise<{ portfolios: IPortfolio[]; total: number }> {
    try {
      this.logger.logDatabase('find', 'portfolios', 0, { limit, offset, filters });

      const query = filters || {};
      const [portfolios, total] = await Promise.all([
        Portfolio.find(query)
          .sort({ updatedAt: -1 })
          .limit(limit)
          .skip(offset),
        Portfolio.countDocuments(query)
      ]);

      return { portfolios, total };

    } catch (error) {
      this.logger.error('Failed to find all portfolios', error, { limit, offset });
      throw error;
    }
  }

  /**
   * Get portfolios by risk score range
   */
  public async findByRiskScore(
    minRisk: number,
    maxRisk: number,
    limit: number = 50,
    offset: number = 0
  ): Promise<{ portfolios: IPortfolio[]; total: number }> {
    try {
      this.logger.logDatabase('find', 'portfolios', 0, { minRisk, maxRisk, limit, offset });

      const query = {
        riskScore: { $gte: minRisk, $lte: maxRisk }
      };

      const [portfolios, total] = await Promise.all([
        Portfolio.find(query)
          .sort({ riskScore: -1 })
          .limit(limit)
          .skip(offset),
        Portfolio.countDocuments(query)
      ]);

      return { portfolios, total };

    } catch (error) {
      this.logger.error('Failed to find portfolios by risk score', error, { minRisk, maxRisk });
      throw error;
    }
  }

  /**
   * Get portfolios by total value range
   */
  public async findByTotalValue(
    minValue: number,
    maxValue: number,
    limit: number = 50,
    offset: number = 0
  ): Promise<{ portfolios: IPortfolio[]; total: number }> {
    try {
      this.logger.logDatabase('find', 'portfolios', 0, { minValue, maxValue, limit, offset });

      const query = {
        totalValue: { $gte: minValue.toString(), $lte: maxValue.toString() }
      };

      const [portfolios, total] = await Promise.all([
        Portfolio.find(query)
          .sort({ totalValue: -1 })
          .limit(limit)
          .skip(offset),
        Portfolio.countDocuments(query)
      ]);

      return { portfolios, total };

    } catch (error) {
      this.logger.error('Failed to find portfolios by total value', error, { minValue, maxValue });
      throw error;
    }
  }

  /**
   * Get portfolio statistics
   */
  public async getStats(): Promise<{
    totalPortfolios: number;
    averageValue: number;
    averageRiskScore: number;
    totalValue: number;
    riskDistribution: Record<string, number>;
    valueDistribution: Record<string, number>;
  }> {
    try {
      this.logger.logDatabase('aggregate', 'portfolios', 0, {});

      const [
        totalPortfolios,
        averageValue,
        averageRiskScore,
        totalValue,
        riskDistribution,
        valueDistribution
      ] = await Promise.all([
        Portfolio.countDocuments(),
        Portfolio.aggregate([
          { $group: { _id: null, avg: { $avg: { $toDouble: '$totalValue' } } } }
        ]),
        Portfolio.aggregate([
          { $group: { _id: null, avg: { $avg: '$riskScore' } } }
        ]),
        Portfolio.aggregate([
          { $group: { _id: null, total: { $sum: { $toDouble: '$totalValue' } } } }
        ]),
        Portfolio.aggregate([
          {
            $bucket: {
              groupBy: '$riskScore',
              boundaries: [0, 25, 50, 75, 100],
              default: 'other',
              output: { count: { $sum: 1 } }
            }
          }
        ]),
        Portfolio.aggregate([
          {
            $bucket: {
              groupBy: { $toDouble: '$totalValue' },
              boundaries: [0, 1000, 10000, 100000, 1000000],
              default: 'other',
              output: { count: { $sum: 1 } }
            }
          }
        ])
      ]);

      return {
        totalPortfolios,
        averageValue: averageValue[0]?.avg || 0,
        averageRiskScore: averageRiskScore[0]?.avg || 0,
        totalValue: totalValue[0]?.total || 0,
        riskDistribution: riskDistribution.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {} as Record<string, number>),
        valueDistribution: valueDistribution.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {} as Record<string, number>)
      };

    } catch (error) {
      this.logger.error('Failed to get portfolio stats', error);
      throw error;
    }
  }

  /**
   * Get top performing portfolios
   */
  public async getTopPerformers(
    limit: number = 10,
    timeframe: '1d' | '7d' | '30d' = '7d'
  ): Promise<IPortfolio[]> {
    try {
      this.logger.logDatabase('find', 'portfolios', 0, { limit, timeframe });

      // This would typically involve calculating performance metrics
      // For now, return portfolios sorted by total value
      const portfolios = await Portfolio.find()
        .sort({ totalValue: -1 })
        .limit(limit);

      return portfolios;

    } catch (error) {
      this.logger.error('Failed to get top performing portfolios', error, { limit, timeframe });
      throw error;
    }
  }

  /**
   * Get portfolios needing rebalancing
   */
  public async getNeedingRebalancing(
    threshold: number = 0.05,
    limit: number = 50
  ): Promise<IPortfolio[]> {
    try {
      this.logger.logDatabase('find', 'portfolios', 0, { threshold, limit });

      // This would involve complex logic to determine which portfolios need rebalancing
      // For now, return portfolios with high risk scores
      const portfolios = await Portfolio.find({
        riskScore: { $gte: 70 }
      })
        .sort({ riskScore: -1 })
        .limit(limit);

      return portfolios;

    } catch (error) {
      this.logger.error('Failed to get portfolios needing rebalancing', error, { threshold });
      throw error;
    }
  }

  /**
   * Delete portfolio
   */
  public async delete(userId: string): Promise<boolean> {
    try {
      this.logger.logDatabase('deleteOne', 'portfolios', 0, { userId });

      const result = await Portfolio.findOneAndDelete({ userId });
      return !!result;

    } catch (error) {
      this.logger.error('Failed to delete portfolio', error, { userId });
      throw error;
    }
  }

  /**
   * Get portfolio performance over time
   */
  public async getPerformanceHistory(
    userId: string,
    days: number = 30
  ): Promise<Array<{
    date: Date;
    totalValue: number;
    riskScore: number;
    positions: number;
  }>> {
    try {
      this.logger.logDatabase('find', 'portfolios', 0, { userId, days });

      // This would typically come from a separate performance tracking system
      // For now, return mock data
      const history = [];
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      for (let i = 0; i < days; i++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);
        
        history.push({
          date,
          totalValue: 10000 + Math.random() * 2000,
          riskScore: 30 + Math.random() * 40,
          positions: 3 + Math.floor(Math.random() * 5)
        });
      }

      return history;

    } catch (error) {
      this.logger.error('Failed to get portfolio performance history', error, { userId });
      throw error;
    }
  }

  /**
   * Get portfolio diversification metrics
   */
  public async getDiversificationMetrics(userId: string): Promise<{
    hhi: number;
    concentration: number;
    numAssets: number;
    largestPosition: number;
    diversificationScore: number;
  }> {
    try {
      this.logger.logDatabase('findOne', 'portfolios', 0, { userId });

      const portfolio = await Portfolio.findOne({ userId });
      if (!portfolio) {
        throw new Error('Portfolio not found');
      }

      // Calculate Herfindahl-Hirschman Index
      const hhi = portfolio.positions.reduce((sum, pos) => sum + Math.pow(pos.allocation, 2), 0);
      
      // Calculate concentration (largest position allocation)
      const concentration = Math.max(...portfolio.positions.map(p => p.allocation));
      
      // Calculate diversification score (1 - HHI)
      const diversificationScore = 1 - hhi;

      return {
        hhi,
        concentration,
        numAssets: portfolio.positions.length,
        largestPosition: concentration,
        diversificationScore
      };

    } catch (error) {
      this.logger.error('Failed to get portfolio diversification metrics', error, { userId });
      throw error;
    }
  }
}
