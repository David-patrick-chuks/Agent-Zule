import { Request, Response } from 'express';
import { Permission } from '../models/Permission';
import { Logger } from '../utils/Logger';

export class PermissionController {
  private logger = Logger.getInstance();

  /**
   * Get user permissions
   */
  public async getUserPermissions(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const { status, type } = req.query;

      this.logger.logApiRequest('GET', '/api/permissions', 200, 0, { userId, status, type });

      // Build query
      const query: any = { userId };
      if (status) query.status = status;
      if (type) query.type = type;

      const permissions = await Permission.find(query)
        .sort({ createdAt: -1 });

      res.json({
        success: true,
        data: {
          permissions,
          count: permissions.length
        }
      });

    } catch (error) {
      this.logger.error('Failed to get user permissions', error, { userId: req.params.userId });
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Create new permission
   */
  public async createPermission(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const {
        agentId,
        type,
        scope,
        conditions,
        metadata,
        expiresAt
      } = req.body;

      this.logger.logApiRequest('POST', '/api/permissions', 200, 0, { userId, type });

      // Validate required fields
      if (!agentId || !type || !scope) {
        res.status(400).json({
          success: false,
          message: 'Missing required fields: agentId, type, scope'
        });
        return;
      }

      // Create permission
      const permission = new Permission({
        userId,
        agentId,
        type,
        scope,
        conditions: conditions || [],
        status: 'pending',
        metadata: {
          description: metadata?.description || `Permission for ${type}`,
          riskLevel: metadata?.riskLevel || 'medium',
          autoRenew: metadata?.autoRenew || false,
          requiresConfirmation: metadata?.requiresConfirmation || false,
          communityVotingEnabled: metadata?.communityVotingEnabled || true,
          escalationThreshold: metadata?.escalationThreshold || 0.8,
          version: '1.0.0',
          ...metadata
        },
        expiresAt: expiresAt ? new Date(expiresAt) : undefined,
        auditLog: []
      });

      await permission.save();

      // Add audit entry
      await permission.addAuditEntry({
        action: 'granted',
        details: { createdBy: 'user' },
        timestamp: new Date(),
        triggeredBy: 'user',
        reason: 'Permission created by user'
      });

      this.logger.logPermission((permission._id as any).toString(), 'created', {
        userId,
        type,
        agentId
      });

      res.status(201).json({
        success: true,
        message: 'Permission created successfully',
        data: permission
      });

    } catch (error) {
      this.logger.error('Failed to create permission', error, { userId: req.params.userId });
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Update permission
   */
  public async updatePermission(req: Request, res: Response): Promise<void> {
    try {
      const { permissionId } = req.params;
      const updates = req.body;

      this.logger.logApiRequest('PUT', '/api/permissions/:id', 200, 0, { permissionId });

      const permission = await Permission.findById(permissionId);
      if (!permission) {
        res.status(404).json({
          success: false,
          message: 'Permission not found'
        });
        return;
      }

      // Update permission fields
      Object.keys(updates).forEach(key => {
        if (key !== '_id' && key !== 'userId' && key !== 'createdAt') {
          permission[key] = updates[key];
        }
      });

      permission.updatedAt = new Date();
      await permission.save();

      // Add audit entry
      await permission.addAuditEntry({
        action: 'modified',
        details: { changes: updates },
        timestamp: new Date(),
        triggeredBy: 'user',
        reason: 'Permission updated by user'
      });

      this.logger.logPermission(permissionId, 'updated', {
        changes: Object.keys(updates)
      });

      res.json({
        success: true,
        message: 'Permission updated successfully',
        data: permission
      });

    } catch (error) {
      this.logger.error('Failed to update permission', error, { permissionId: req.params.permissionId });
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Revoke permission
   */
  public async revokePermission(req: Request, res: Response): Promise<void> {
    try {
      const { permissionId } = req.params;
      const { reason, triggeredBy = 'user' } = req.body;

      this.logger.logApiRequest('POST', '/api/permissions/:id/revoke', 200, 0, { permissionId, reason });

      const permission = await Permission.findById(permissionId);
      if (!permission) {
        res.status(404).json({
          success: false,
          message: 'Permission not found'
        });
        return;
      }

      if (permission.status === 'revoked') {
        res.status(400).json({
          success: false,
          message: 'Permission is already revoked'
        });
        return;
      }

      // Revoke permission
      await permission.revoke(reason || 'Permission revoked by user', triggeredBy);

      this.logger.logPermission(permissionId, 'revoked', {
        reason,
        triggeredBy
      });

      res.json({
        success: true,
        message: 'Permission revoked successfully',
        data: {
          permissionId,
          status: permission.status,
          revokedAt: permission.revokedAt
        }
      });

    } catch (error) {
      this.logger.error('Failed to revoke permission', error, { permissionId: req.params.permissionId });
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Grant permission
   */
  public async grantPermission(req: Request, res: Response): Promise<void> {
    try {
      const { permissionId } = req.params;

      this.logger.logApiRequest('POST', '/api/permissions/:id/grant', 200, 0, { permissionId });

      const permission = await Permission.findById(permissionId);
      if (!permission) {
        res.status(404).json({
          success: false,
          message: 'Permission not found'
        });
        return;
      }

      if (permission.status !== 'pending') {
        res.status(400).json({
          success: false,
          message: 'Permission is not in pending status'
        });
        return;
      }

      // Grant permission
      await permission.grant();

      this.logger.logPermission(permissionId, 'granted', {
        userId: permission.userId,
        type: permission.type
      });

      res.json({
        success: true,
        message: 'Permission granted successfully',
        data: {
          permissionId,
          status: permission.status,
          grantedAt: permission.grantedAt
        }
      });

    } catch (error) {
      this.logger.error('Failed to grant permission', error, { permissionId: req.params.permissionId });
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Add condition to permission
   */
  public async addCondition(req: Request, res: Response): Promise<void> {
    try {
      const { permissionId } = req.params;
      const condition = req.body;

      this.logger.logApiRequest('POST', '/api/permissions/:id/conditions', 200, 0, { permissionId });

      const permission = await Permission.findById(permissionId);
      if (!permission) {
        res.status(404).json({
          success: false,
          message: 'Permission not found'
        });
        return;
      }

      // Add condition
      await permission.addCondition(condition);

      // Add audit entry
      await permission.addAuditEntry({
        action: 'modified',
        details: { addedCondition: condition },
        timestamp: new Date(),
        triggeredBy: 'user',
        reason: 'Condition added to permission'
      });

      this.logger.logPermission(permissionId, 'condition_added', {
        conditionType: condition.type
      });

      res.json({
        success: true,
        message: 'Condition added successfully',
        data: permission
      });

    } catch (error) {
      this.logger.error('Failed to add condition', error, { permissionId: req.params.permissionId });
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Remove condition from permission
   */
  public async removeCondition(req: Request, res: Response): Promise<void> {
    try {
      const { permissionId, conditionId } = req.params;

      this.logger.logApiRequest('DELETE', '/api/permissions/:id/conditions/:conditionId', 200, 0, { permissionId, conditionId });

      const permission = await Permission.findById(permissionId);
      if (!permission) {
        res.status(404).json({
          success: false,
          message: 'Permission not found'
        });
        return;
      }

      // Remove condition
      await permission.removeCondition(conditionId);

      // Add audit entry
      await permission.addAuditEntry({
        action: 'modified',
        details: { removedCondition: conditionId },
        timestamp: new Date(),
        triggeredBy: 'user',
        reason: 'Condition removed from permission'
      });

      this.logger.logPermission(permissionId, 'condition_removed', {
        conditionId
      });

      res.json({
        success: true,
        message: 'Condition removed successfully',
        data: permission
      });

    } catch (error) {
      this.logger.error('Failed to remove condition', error, { permissionId: req.params.permissionId });
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get permission audit log
   */
  public async getAuditLog(req: Request, res: Response): Promise<void> {
    try {
      const { permissionId } = req.params;
      const { limit = 50, offset = 0 } = req.query;

      this.logger.logApiRequest('GET', '/api/permissions/:id/audit', 200, 0, { permissionId });

      const permission = await Permission.findById(permissionId);
      if (!permission) {
        res.status(404).json({
          success: false,
          message: 'Permission not found'
        });
        return;
      }

      // Get audit log with pagination
      const auditLog = permission.auditLog
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(parseInt(offset as string), parseInt(offset as string) + parseInt(limit as string));

      res.json({
        success: true,
        data: {
          auditLog,
          total: permission.auditLog.length,
          pagination: {
            limit: parseInt(limit as string),
            offset: parseInt(offset as string),
            hasMore: auditLog.length === parseInt(limit as string)
          }
        }
      });

    } catch (error) {
      this.logger.error('Failed to get audit log', error, { permissionId: req.params.permissionId });
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get permission statistics
   */
  public async getPermissionStats(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const { timeframe = '30d' } = req.query;

      this.logger.logApiRequest('GET', '/api/permissions/stats', 200, 0, { userId, timeframe });

      // Calculate timeframe
      const days = parseInt((timeframe as string).replace('d', ''));
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      // Get statistics
      const stats = await Permission.aggregate([
        {
          $match: {
            userId,
            createdAt: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: null,
            totalPermissions: { $sum: 1 },
            activePermissions: {
              $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
            },
            revokedPermissions: {
              $sum: { $cond: [{ $eq: ['$status', 'revoked'] }, 1, 0] }
            },
            expiredPermissions: {
              $sum: { $cond: [{ $eq: ['$status', 'expired'] }, 1, 0] }
            },
            byType: {
              $push: {
                type: '$type',
                status: '$status'
              }
            }
          }
        }
      ]);

      const result = stats[0] || {
        totalPermissions: 0,
        activePermissions: 0,
        revokedPermissions: 0,
        expiredPermissions: 0,
        byType: []
      };

      // Calculate additional metrics
      const activeRate = result.totalPermissions > 0 ? 
        (result.activePermissions / result.totalPermissions) * 100 : 0;

      res.json({
        success: true,
        data: {
          ...result,
          activeRate,
          timeframe,
          generatedAt: new Date()
        }
      });

    } catch (error) {
      this.logger.error('Failed to get permission stats', error, { userId: req.params.userId });
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Check permission validity
   */
  public async checkPermission(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const { action, token, amount } = req.query;

      this.logger.logApiRequest('GET', '/api/permissions/check', 200, 0, { userId, action, token, amount });

      // Get active permissions for user
      const activePermissions = await Permission.find({
        userId,
        status: 'active'
      });

      // Check if action is permitted
      const isPermitted = this.checkActionPermission(
        activePermissions,
        action as string,
        token as string,
        parseFloat(amount as string)
      );

      res.json({
        success: true,
        data: {
          isPermitted,
          action,
          token,
          amount,
          checkedAt: new Date()
        }
      });

    } catch (error) {
      this.logger.error('Failed to check permission', error, { userId: req.params.userId });
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Private helper methods
  private checkActionPermission(
    permissions: any[],
    action: string,
    token: string,
    amount: number
  ): boolean {
    for (const permission of permissions) {
      // Check if permission type matches action
      if (permission.type !== action) continue;

      // Check if token is in scope
      if (permission.scope.tokens.length > 0 && 
          !permission.scope.tokens.includes(token)) continue;

      // Check amount limits
      if (amount > parseFloat(permission.scope.maxAmount)) continue;
      if (amount > permission.scope.maxPercentage * 1000000) continue; // Assuming portfolio value

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

        if (!isInTimeWindow) continue;
      }

      // Check frequency limits
      if (permission.scope.frequency) {
        // This would require checking recent transaction history
        // For now, assume it's within limits
      }

      // Check conditions
      if (permission.conditions.length > 0) {
        const conditionsMet = this.checkConditions(permission.conditions);
        if (!conditionsMet) continue;
      }

      return true;
    }

    return false;
  }

  private checkConditions(conditions: any[]): boolean {
    // Simplified condition checking
    // In production, this would evaluate each condition based on current market data
    return conditions.every(condition => condition.isActive);
  }
}
