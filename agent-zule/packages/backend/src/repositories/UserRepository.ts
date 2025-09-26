import { User, IUser } from '../models/User';
import { Logger } from '../utils/Logger';

export class UserRepository {
  private logger = Logger.getInstance();

  /**
   * Create a new user
   */
  public async create(userData: Partial<IUser>): Promise<IUser> {
    try {
      this.logger.logDatabase('create', 'users', 0, { walletAddress: userData.walletAddress });

      const user = new User(userData);
      await user.save();

      this.logger.logDatabase('create', 'users', 0, { userId: user._id, walletAddress: user.walletAddress });
      return user;

    } catch (error) {
      this.logger.error('Failed to create user', error, { walletAddress: userData.walletAddress });
      throw error;
    }
  }

  /**
   * Find user by wallet address
   */
  public async findByWalletAddress(walletAddress: string): Promise<IUser | null> {
    try {
      this.logger.logDatabase('findOne', 'users', 0, { walletAddress });

      const user = await User.findOne({ walletAddress });
      return user;

    } catch (error) {
      this.logger.error('Failed to find user by wallet address', error, { walletAddress });
      throw error;
    }
  }

  /**
   * Find user by ID
   */
  public async findById(userId: string): Promise<IUser | null> {
    try {
      this.logger.logDatabase('findById', 'users', 0, { userId });

      const user = await User.findById(userId);
      return user;

    } catch (error) {
      this.logger.error('Failed to find user by ID', error, { userId });
      throw error;
    }
  }

  /**
   * Update user preferences
   */
  public async updatePreferences(
    userId: string,
    preferences: Partial<IUser['preferences']>
  ): Promise<IUser | null> {
    try {
      this.logger.logDatabase('updateOne', 'users', 0, { userId, preferences });

      const user = await User.findByIdAndUpdate(
        userId,
        { 
          $set: { 
            preferences: { ...preferences },
            updatedAt: new Date()
          }
        },
        { new: true }
      );

      return user;

    } catch (error) {
      this.logger.error('Failed to update user preferences', error, { userId });
      throw error;
    }
  }

  /**
   * Update user permissions
   */
  public async updatePermissions(
    userId: string,
    permissions: Partial<IUser['permissions']>
  ): Promise<IUser | null> {
    try {
      this.logger.logDatabase('updateOne', 'users', 0, { userId, permissions });

      const user = await User.findByIdAndUpdate(
        userId,
        { 
          $set: { 
            permissions: { ...permissions },
            updatedAt: new Date()
          }
        },
        { new: true }
      );

      return user;

    } catch (error) {
      this.logger.error('Failed to update user permissions', error, { userId });
      throw error;
    }
  }

  /**
   * Get all users with pagination
   */
  public async findAll(
    limit: number = 50,
    offset: number = 0,
    filters?: Partial<IUser>
  ): Promise<{ users: IUser[]; total: number }> {
    try {
      this.logger.logDatabase('find', 'users', 0, { limit, offset, filters });

      const query = filters || {};
      const [users, total] = await Promise.all([
        User.find(query)
          .sort({ createdAt: -1 })
          .limit(limit)
          .skip(offset),
        User.countDocuments(query)
      ]);

      return { users, total };

    } catch (error) {
      this.logger.error('Failed to find all users', error, { limit, offset });
      throw error;
    }
  }

  /**
   * Delete user
   */
  public async delete(userId: string): Promise<boolean> {
    try {
      this.logger.logDatabase('deleteOne', 'users', 0, { userId });

      const result = await User.findByIdAndDelete(userId);
      return !!result;

    } catch (error) {
      this.logger.error('Failed to delete user', error, { userId });
      throw error;
    }
  }

  /**
   * Get user statistics
   */
  public async getStats(): Promise<{
    totalUsers: number;
    activeUsers: number;
    newUsersToday: number;
    newUsersThisWeek: number;
    riskToleranceDistribution: Record<string, number>;
  }> {
    try {
      this.logger.logDatabase('aggregate', 'users', 0, {});

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      const [
        totalUsers,
        activeUsers,
        newUsersToday,
        newUsersThisWeek,
        riskToleranceStats
      ] = await Promise.all([
        User.countDocuments(),
        User.countDocuments({ 'permissions.autoRevokeThreshold': { $exists: true } }),
        User.countDocuments({ createdAt: { $gte: today } }),
        User.countDocuments({ createdAt: { $gte: weekAgo } }),
        User.aggregate([
          {
            $group: {
              _id: '$preferences.riskTolerance',
              count: { $sum: 1 }
            }
          }
        ])
      ]);

      const riskToleranceDistribution = riskToleranceStats.reduce((acc, stat) => {
        acc[stat._id] = stat.count;
        return acc;
      }, {} as Record<string, number>);

      return {
        totalUsers,
        activeUsers,
        newUsersToday,
        newUsersThisWeek,
        riskToleranceDistribution
      };

    } catch (error) {
      this.logger.error('Failed to get user stats', error);
      throw error;
    }
  }

  /**
   * Search users by criteria
   */
  public async search(
    searchTerm: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<{ users: IUser[]; total: number }> {
    try {
      this.logger.logDatabase('search', 'users', 0, { searchTerm, limit, offset });

      const query = {
        $or: [
          { walletAddress: { $regex: searchTerm, $options: 'i' } },
          { 'preferences.investmentGoals': { $regex: searchTerm, $options: 'i' } }
        ]
      };

      const [users, total] = await Promise.all([
        User.find(query)
          .sort({ createdAt: -1 })
          .limit(limit)
          .skip(offset),
        User.countDocuments(query)
      ]);

      return { users, total };

    } catch (error) {
      this.logger.error('Failed to search users', error, { searchTerm });
      throw error;
    }
  }

  /**
   * Get users by risk tolerance
   */
  public async findByRiskTolerance(
    riskTolerance: 'low' | 'medium' | 'high',
    limit: number = 50,
    offset: number = 0
  ): Promise<{ users: IUser[]; total: number }> {
    try {
      this.logger.logDatabase('find', 'users', 0, { riskTolerance, limit, offset });

      const query = { 'preferences.riskTolerance': riskTolerance };
      
      const [users, total] = await Promise.all([
        User.find(query)
          .sort({ createdAt: -1 })
          .limit(limit)
          .skip(offset),
        User.countDocuments(query)
      ]);

      return { users, total };

    } catch (error) {
      this.logger.error('Failed to find users by risk tolerance', error, { riskTolerance });
      throw error;
    }
  }

  /**
   * Update user last activity
   */
  public async updateLastActivity(userId: string): Promise<void> {
    try {
      this.logger.logDatabase('updateOne', 'users', 0, { userId });

      await User.findByIdAndUpdate(
        userId,
        { 
          $set: { 
            updatedAt: new Date()
          }
        }
      );

    } catch (error) {
      this.logger.error('Failed to update user last activity', error, { userId });
      throw error;
    }
  }

  /**
   * Get user activity summary
   */
  public async getActivitySummary(userId: string): Promise<{
    lastActivity: Date;
    totalSessions: number;
    averageSessionDuration: number;
    riskTolerance: string;
    investmentGoals: string[];
  }> {
    try {
      this.logger.logDatabase('findOne', 'users', 0, { userId });

      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // This would typically come from a separate activity tracking system
      return {
        lastActivity: user.updatedAt,
        totalSessions: 1, // Placeholder
        averageSessionDuration: 30, // Placeholder in minutes
        riskTolerance: user.preferences.riskTolerance,
        investmentGoals: user.preferences.investmentGoals
      };

    } catch (error) {
      this.logger.error('Failed to get user activity summary', error, { userId });
      throw error;
    }
  }
}
