import { Permission, IPermission } from '../models/Permission';
import { Logger } from '../utils/Logger';

export class PermissionRepository {
  private logger = Logger.getInstance();

  /**
   * Create a new permission
   */
  public async create(permissionData: Partial<IPermission>): Promise<IPermission> {
    try {
      this.logger.logDatabase('create', 'permissions', 0, { userId: permissionData.userId, type: permissionData.type });

      const permission = new Permission(permissionData);
      await permission.save();

      this.logger.logDatabase('create', 'permissions', 0, { permissionId: permission._id, userId: permission.userId });
      return permission;

    } catch (error) {
      this.logger.error('Failed to create permission', error, { userId: permissionData.userId });
      throw error;
    }
  }

  /**
   * Find permission by ID
   */
  public async findById(permissionId: string): Promise<IPermission | null> {
    try {
      this.logger.logDatabase('findById', 'permissions', 0, { permissionId });

      const permission = await Permission.findById(permissionId);
      return permission;

    } catch (error) {
      this.logger.error('Failed to find permission by ID', error, { permissionId });
      throw error;
    }
  }

  /**
   * Find permissions by user ID
   */
  public async findByUserId(
    userId: string,
    status?: IPermission['status'],
    limit: number = 50,
    offset: number = 0
  ): Promise<{ permissions: IPermission[]; total: number }> {
    try {
      this.logger.logDatabase('find', 'permissions', 0, { userId, status, limit, offset });

      const query: any = { userId };
      if (status) query.status = status;

      const [permissions, total] = await Promise.all([
        Permission.find(query)
          .sort({ createdAt: -1 })
          .limit(limit)
          .skip(offset),
        Permission.countDocuments(query)
      ]);

      return { permissions, total };

    } catch (error) {
      this.logger.error('Failed to find permissions by user ID', error, { userId });
      throw error;
    }
  }

  /**
   * Find active permissions for user
   */
  public async findActiveByUserId(userId: string): Promise<IPermission[]> {
    try {
      this.logger.logDatabase('find', 'permissions', 0, { userId, status: 'active' });

      const permissions = await Permission.find({
        userId,
        status: 'active'
      }).sort({ createdAt: -1 });

      return permissions;

    } catch (error) {
      this.logger.error('Failed to find active permissions by user ID', error, { userId });
      throw error;
    }
  }

  /**
   * Find permissions by type
   */
  public async findByType(
    type: IPermission['type'],
    status?: IPermission['status'],
    limit: number = 50,
    offset: number = 0
  ): Promise<{ permissions: IPermission[]; total: number }> {
    try {
      this.logger.logDatabase('find', 'permissions', 0, { type, status, limit, offset });

      const query: any = { type };
      if (status) query.status = status;

      const [permissions, total] = await Promise.all([
        Permission.find(query)
          .sort({ createdAt: -1 })
          .limit(limit)
          .skip(offset),
        Permission.countDocuments(query)
      ]);

      return { permissions, total };

    } catch (error) {
      this.logger.error('Failed to find permissions by type', error, { type });
      throw error;
    }
  }

  /**
   * Update permission status
   */
  public async updateStatus(
    permissionId: string,
    status: IPermission['status'],
    additionalData?: Partial<IPermission>
  ): Promise<IPermission | null> {
    try {
      this.logger.logDatabase('updateOne', 'permissions', 0, { permissionId, status });

      const updateData: any = { 
        status,
        updatedAt: new Date()
      };

      // Add timestamp based on status
      if (status === 'revoked') {
        updateData.revokedAt = new Date();
      }

      // Add additional data if provided
      if (additionalData) {
        Object.assign(updateData, additionalData);
      }

      const permission = await Permission.findByIdAndUpdate(
        permissionId,
        { $set: updateData },
        { new: true }
      );

      return permission;

    } catch (error) {
      this.logger.error('Failed to update permission status', error, { permissionId, status });
      throw error;
    }
  }

  /**
   * Add condition to permission
   */
  public async addCondition(
    permissionId: string,
    condition: any
  ): Promise<IPermission | null> {
    try {
      this.logger.logDatabase('updateOne', 'permissions', 0, { permissionId });

      const permission = await Permission.findById(permissionId);
      if (!permission) {
        throw new Error('Permission not found');
      }

      await permission.addCondition(condition);
      return permission;

    } catch (error) {
      this.logger.error('Failed to add condition to permission', error, { permissionId });
      throw error;
    }
  }

  /**
   * Remove condition from permission
   */
  public async removeCondition(
    permissionId: string,
    conditionId: string
  ): Promise<IPermission | null> {
    try {
      this.logger.logDatabase('updateOne', 'permissions', 0, { permissionId, conditionId });

      const permission = await Permission.findById(permissionId);
      if (!permission) {
        throw new Error('Permission not found');
      }

      await permission.removeCondition(conditionId);
      return permission;

    } catch (error) {
      this.logger.error('Failed to remove condition from permission', error, { permissionId, conditionId });
      throw error;
    }
  }

  /**
   * Update condition in permission
   */
  public async updateCondition(
    permissionId: string,
    conditionId: string,
    updates: any
  ): Promise<IPermission | null> {
    try {
      this.logger.logDatabase('updateOne', 'permissions', 0, { permissionId, conditionId });

      const permission = await Permission.findById(permissionId);
      if (!permission) {
        throw new Error('Permission not found');
      }

      await permission.updateCondition(conditionId, updates);
      return permission;

    } catch (error) {
      this.logger.error('Failed to update condition in permission', error, { permissionId, conditionId });
      throw error;
    }
  }

  /**
   * Get permission statistics
   */
  public async getStats(
    userId?: string,
    timeframe?: '1d' | '7d' | '30d' | '90d'
  ): Promise<{
    totalPermissions: number;
    activePermissions: number;
    revokedPermissions: number;
    expiredPermissions: number;
    pendingPermissions: number;
    byType: Record<string, number>;
    byStatus: Record<string, number>;
    averageLifetime: number;
  }> {
    try {
      this.logger.logDatabase('aggregate', 'permissions', 0, { userId, timeframe });

      // Calculate date filter
      let dateFilter = {};
      if (timeframe) {
        const days = parseInt(timeframe.replace('d', ''));
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        dateFilter = { createdAt: { $gte: startDate } };
      }

      const baseQuery = userId ? { userId, ...dateFilter } : dateFilter;

      const [
        totalPermissions,
        activePermissions,
        revokedPermissions,
        expiredPermissions,
        pendingPermissions,
        byType,
        byStatus,
        averageLifetime
      ] = await Promise.all([
        Permission.countDocuments(baseQuery),
        Permission.countDocuments({ ...baseQuery, status: 'active' }),
        Permission.countDocuments({ ...baseQuery, status: 'revoked' }),
        Permission.countDocuments({ ...baseQuery, status: 'expired' }),
        Permission.countDocuments({ ...baseQuery, status: 'pending' }),
        Permission.aggregate([
          { $match: baseQuery },
          { $group: { _id: '$type', count: { $sum: 1 } } }
        ]),
        Permission.aggregate([
          { $match: baseQuery },
          { $group: { _id: '$status', count: { $sum: 1 } } }
        ]),
        Permission.aggregate([
          { $match: { ...baseQuery, revokedAt: { $exists: true } } },
          { $project: { lifetime: { $subtract: ['$revokedAt', '$grantedAt'] } } },
          { $group: { _id: null, avg: { $avg: '$lifetime' } } }
        ])
      ]);

      return {
        totalPermissions,
        activePermissions,
        revokedPermissions,
        expiredPermissions,
        pendingPermissions,
        byType: byType.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {} as Record<string, number>),
        byStatus: byStatus.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {} as Record<string, number>),
        averageLifetime: averageLifetime[0]?.avg || 0
      };

    } catch (error) {
      this.logger.error('Failed to get permission stats', error, { userId, timeframe });
      throw error;
    }
  }

  /**
   * Get expired permissions
   */
  public async getExpired(): Promise<IPermission[]> {
    try {
      this.logger.logDatabase('find', 'permissions', 0, {});

      const now = new Date();
      const permissions = await Permission.find({
        status: 'active',
        expiresAt: { $lte: now }
      });

      return permissions;

    } catch (error) {
      this.logger.error('Failed to get expired permissions', error);
      throw error;
    }
  }

  /**
   * Update expired permissions
   */
  public async updateExpired(): Promise<number> {
    try {
      this.logger.logDatabase('updateMany', 'permissions', 0, {});

      const now = new Date();
      const result = await Permission.updateMany(
        {
          status: 'active',
          expiresAt: { $lte: now }
        },
        {
          $set: {
            status: 'expired',
            updatedAt: now
          }
        }
      );

      this.logger.info(`Updated ${result.modifiedCount} expired permissions`);
      return result.modifiedCount;

    } catch (error) {
      this.logger.error('Failed to update expired permissions', error);
      throw error;
    }
  }

  /**
   * Get permissions due for renewal
   */
  public async getDueForRenewal(): Promise<IPermission[]> {
    try {
      this.logger.logDatabase('find', 'permissions', 0, {});

      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

      const permissions = await Permission.find({
        status: 'active',
        'metadata.autoRenew': true,
        expiresAt: { $lte: thirtyDaysFromNow }
      });

      return permissions;

    } catch (error) {
      this.logger.error('Failed to get permissions due for renewal', error);
      throw error;
    }
  }

  /**
   * Get permission audit log
   */
  public async getAuditLog(
    permissionId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<{ auditLog: any[]; total: number }> {
    try {
      this.logger.logDatabase('find', 'permissions', 0, { permissionId, limit, offset });

      const permission = await Permission.findById(permissionId);
      if (!permission) {
        throw new Error('Permission not found');
      }

      const auditLog = permission.auditLog
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(offset, offset + limit);

      return {
        auditLog,
        total: permission.auditLog.length
      };

    } catch (error) {
      this.logger.error('Failed to get permission audit log', error, { permissionId });
      throw error;
    }
  }

  /**
   * Check if user has permission for action
   */
  public async checkPermission(
    userId: string,
    action: string,
    token?: string,
    amount?: number
  ): Promise<{
    hasPermission: boolean;
    permission?: IPermission;
    reason?: string;
  }> {
    try {
      this.logger.logDatabase('find', 'permissions', 0, { userId, action });

      const permissions = await Permission.find({
        userId,
        status: 'active',
        type: action
      });

      for (const permission of permissions) {
        // Check token scope
        if (token && permission.scope.tokens.length > 0 && 
            !permission.scope.tokens.includes(token)) {
          continue;
        }

        // Check amount limits
        if (amount) {
          if (amount > parseFloat(permission.scope.maxAmount)) {
            continue;
          }
          if (amount > permission.scope.maxPercentage * 1000000) { // Assuming portfolio value
            continue;
          }
        }

        // Check time windows
        if (permission.scope.timeWindows.length > 0) {
          const now = new Date();
          const currentHour = now.getHours();
          const currentDay = now.getDay();
          
          const isInTimeWindow = permission.scope.timeWindows.some((window: any) => {
            const startHour = parseInt(window.start.split(':')[0]);
            const endHour = parseInt(window.end.split(':')[0]);
            return window.days.includes(currentDay) && 
                   currentHour >= startHour && 
                   currentHour <= endHour;
          });

          if (!isInTimeWindow) {
            continue;
          }
        }

        // Check conditions
        if (permission.conditions.length > 0) {
          const conditionsMet = this.checkConditions(permission.conditions);
          if (!conditionsMet) {
            continue;
          }
        }

        return {
          hasPermission: true,
          permission
        };
      }

      return {
        hasPermission: false,
        reason: 'No matching active permission found'
      };

    } catch (error) {
      this.logger.error('Failed to check permission', error, { userId, action });
      throw error;
    }
  }

  /**
   * Delete permission
   */
  public async delete(permissionId: string): Promise<boolean> {
    try {
      this.logger.logDatabase('deleteOne', 'permissions', 0, { permissionId });

      const result = await Permission.findByIdAndDelete(permissionId);
      return !!result;

    } catch (error) {
      this.logger.error('Failed to delete permission', error, { permissionId });
      throw error;
    }
  }

  /**
   * Get permissions by agent ID
   */
  public async findByAgentId(
    agentId: string,
    status?: IPermission['status'],
    limit: number = 50,
    offset: number = 0
  ): Promise<{ permissions: IPermission[]; total: number }> {
    try {
      this.logger.logDatabase('find', 'permissions', 0, { agentId, status, limit, offset });

      const query: any = { agentId };
      if (status) query.status = status;

      const [permissions, total] = await Promise.all([
        Permission.find(query)
          .sort({ createdAt: -1 })
          .limit(limit)
          .skip(offset),
        Permission.countDocuments(query)
      ]);

      return { permissions, total };

    } catch (error) {
      this.logger.error('Failed to find permissions by agent ID', error, { agentId });
      throw error;
    }
  }

  // Private helper methods
  private checkConditions(conditions: any[]): boolean {
    // Simplified condition checking
    // In production, this would evaluate each condition based on current market data
    return conditions.every(condition => condition.isActive);
  }
}
