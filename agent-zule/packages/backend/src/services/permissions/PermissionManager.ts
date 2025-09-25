import { Logger } from '../../utils/Logger';
import { Permission, IPermission, PermissionCondition, PermissionAuditEntry } from '../../models/Permission';
import { User } from '../../models/User';
import { PermissionType, PermissionStatus, ConditionType } from '../../types/Permission';
import { MarketCondition } from '../../types/Common';

export interface PermissionEvaluationResult {
  isAllowed: boolean;
  reason?: string;
  triggeredConditions: string[];
  requiresCommunityVote: boolean;
  riskLevel: 'low' | 'medium' | 'high';
}

export interface CommunityVote {
  voter: string;
  vote: 'approve' | 'reject';
  reasoning?: string;
  timestamp: Date;
  stake?: number; // Voting power based on stake
}

export interface PermissionRequest {
  userId: string;
  permissionType: PermissionType;
  requestedAmount: string;
  tokenAddress: string;
  action: 'trade' | 'rebalance' | 'yield_optimize' | 'dca' | 'emergency';
  metadata?: Record<string, any>;
}

export class PermissionManager {
  private static instance: PermissionManager;
  private logger = Logger.getInstance();

  private constructor() {}

  public static getInstance(): PermissionManager {
    if (!PermissionManager.instance) {
      PermissionManager.instance = new PermissionManager();
    }
    return PermissionManager.instance;
  }

  /**
   * Evaluate if a permission request should be allowed
   */
  public async evaluatePermission(
    request: PermissionRequest,
    marketData: MarketCondition
  ): Promise<PermissionEvaluationResult> {
    try {
      this.logger.logAI('PermissionManager', 'evaluation_started', {
        userId: request.userId,
        permissionType: request.permissionType,
        action: request.action
      });

      // Get user's active permissions for this type
      const permissions = await Permission.findActivePermissions(request.userId, request.permissionType);
      
      if (permissions.length === 0) {
        return {
          isAllowed: false,
          reason: 'No active permissions found for this action',
          triggeredConditions: [],
          requiresCommunityVote: false,
          riskLevel: 'high'
        };
      }

      // Evaluate each permission
      const results = await Promise.all(
        permissions.map(permission => this.evaluatePermissionConditions(permission, request, marketData))
      );

      // Find the best matching permission
      const bestMatch = results.find(r => r.isAllowed) || results[0];

      // Check if community voting is required
      const requiresCommunityVote = this.shouldRequireCommunityVote(request, marketData, bestMatch);

      this.logger.logAI('PermissionManager', 'evaluation_completed', {
        userId: request.userId,
        isAllowed: bestMatch.isAllowed,
        requiresCommunityVote,
        riskLevel: bestMatch.riskLevel
      });

      return {
        ...bestMatch,
        requiresCommunityVote
      };

    } catch (error) {
      this.logger.error('Permission evaluation failed', error, {
        userId: request.userId,
        permissionType: request.permissionType
      });

      return {
        isAllowed: false,
        reason: 'Permission evaluation failed',
        triggeredConditions: [],
        requiresCommunityVote: false,
        riskLevel: 'high'
      };
    }
  }

  /**
   * Create a new permission with conditions
   */
  public async createPermission(
    userId: string,
    agentId: string,
    permissionType: PermissionType,
    scope: IPermission['scope'],
    conditions: Omit<PermissionCondition, 'id'>[],
    metadata: IPermission['metadata']
  ): Promise<IPermission> {
    try {
      this.logger.logAI('PermissionManager', 'permission_created', {
        userId,
        agentId,
        permissionType,
        conditionsCount: conditions.length
      });

      const permission = new Permission({
        userId,
        agentId,
        type: permissionType,
        scope,
        conditions: conditions.map(condition => ({
          ...condition,
          id: this.generateConditionId()
        })),
        status: PermissionStatus.PENDING,
        metadata
      });

      await permission.save();

      // Add audit entry
      await permission.addAuditEntry({
        action: 'granted',
        details: { permissionType, conditionsCount: conditions.length },
        timestamp: new Date(),
        triggeredBy: 'user',
        reason: 'Permission created'
      });

      return permission;

    } catch (error) {
      this.logger.error('Failed to create permission', error, {
        userId,
        permissionType
      });
      throw error;
    }
  }

  /**
   * Update permission conditions
   */
  public async updatePermissionConditions(
    permissionId: string,
    newConditions: Omit<PermissionCondition, 'id'>[]
  ): Promise<IPermission | null> {
    try {
      const permission = await Permission.findById(permissionId);
      if (!permission) {
        throw new Error('Permission not found');
      }

      // Clear existing conditions and add new ones
      permission.conditions = newConditions.map(condition => ({
        ...condition,
        id: this.generateConditionId()
      }));

      await permission.save();

      // Add audit entry
      await permission.addAuditEntry({
        action: 'modified',
        details: { conditionsCount: newConditions.length },
        timestamp: new Date(),
        triggeredBy: 'user',
        reason: 'Permission conditions updated'
      });

      this.logger.logAI('PermissionManager', 'permission_updated', {
        permissionId,
        conditionsCount: newConditions.length
      });

      return permission;

    } catch (error) {
      this.logger.error('Failed to update permission conditions', error, {
        permissionId
      });
      throw error;
    }
  }

  /**
   * Revoke permission with reason
   */
  public async revokePermission(
    permissionId: string,
    reason: string,
    triggeredBy: 'user' | 'system' | 'community' | 'ai' = 'user'
  ): Promise<IPermission | null> {
    try {
      const permission = await Permission.findById(permissionId);
      if (!permission) {
        throw new Error('Permission not found');
      }

      await permission.revoke(reason, triggeredBy);

      this.logger.logAI('PermissionManager', 'permission_revoked', {
        permissionId,
        reason,
        triggeredBy
      });

      return permission;

    } catch (error) {
      this.logger.error('Failed to revoke permission', error, {
        permissionId
      });
      throw error;
    }
  }

  /**
   * Add community vote to permission
   */
  public async addCommunityVote(
    permissionId: string,
    vote: CommunityVote
  ): Promise<{ permission: IPermission; consensus: boolean }> {
    try {
      const permission = await Permission.findById(permissionId);
      if (!permission) {
        throw new Error('Permission not found');
      }

      // Check if voting is enabled for this permission
      if (!permission.metadata.communityVotingEnabled) {
        throw new Error('Community voting is not enabled for this permission');
      }

      // Add vote to metadata (in production, this would be a separate collection)
      const votes = permission.metadata.votes || [];
      votes.push(vote);
      permission.metadata.votes = votes;

      // Check for consensus
      const consensus = this.checkConsensus(votes, permission.metadata.escalationThreshold);
      
      if (consensus) {
        const approvalRate = this.calculateApprovalRate(votes);
        if (approvalRate >= permission.metadata.escalationThreshold) {
          await permission.grant();
        } else {
          await permission.revoke('Community rejected the permission', 'community');
        }
      }

      await permission.save();

      // Add audit entry
      await permission.addAuditEntry({
        action: 'escalated',
        details: { vote, consensus, approvalRate: this.calculateApprovalRate(votes) },
        timestamp: new Date(),
        triggeredBy: 'community',
        reason: 'Community vote recorded'
      });

      this.logger.logAI('PermissionManager', 'community_vote_added', {
        permissionId,
        voter: vote.voter,
        vote: vote.vote,
        consensus
      });

      return { permission, consensus };

    } catch (error) {
      this.logger.error('Failed to add community vote', error, {
        permissionId
      });
      throw error;
    }
  }

  /**
   * Auto-revoke permissions based on market conditions
   */
  public async autoRevokePermissions(
    marketData: MarketCondition
  ): Promise<{ revokedCount: number; revokedPermissions: string[] }> {
    try {
      const revokedPermissions: string[] = [];
      let revokedCount = 0;

      // Find permissions that should be auto-revoked based on market conditions
      const activePermissions = await Permission.findActivePermissions();
      
      for (const permission of activePermissions) {
        const shouldRevoke = await this.shouldAutoRevoke(permission, marketData);
        
        if (shouldRevoke.should) {
          await permission.revoke(shouldRevoke.reason, 'system');
          revokedPermissions.push(permission._id.toString());
          revokedCount++;
        }
      }

      if (revokedCount > 0) {
        this.logger.logAI('PermissionManager', 'auto_revoke_completed', {
          revokedCount,
          marketVolatility: marketData.volatility,
          marketTrend: marketData.trend
        });
      }

      return { revokedCount, revokedPermissions };

    } catch (error) {
      this.logger.error('Failed to auto-revoke permissions', error);
      throw error;
    }
  }

  /**
   * Get permission analytics for a user
   */
  public async getPermissionAnalytics(userId: string): Promise<{
    totalPermissions: number;
    activePermissions: number;
    revokedPermissions: number;
    pendingPermissions: number;
    averagePermissionDuration: number;
    mostUsedPermissions: Array<{ type: PermissionType; count: number }>;
    riskDistribution: Record<string, number>;
  }> {
    try {
      const permissions = await Permission.findByUserId(userId);
      
      const analytics = {
        totalPermissions: permissions.length,
        activePermissions: permissions.filter(p => p.status === PermissionStatus.ACTIVE).length,
        revokedPermissions: permissions.filter(p => p.status === PermissionStatus.REVOKED).length,
        pendingPermissions: permissions.filter(p => p.status === PermissionStatus.PENDING).length,
        averagePermissionDuration: this.calculateAverageDuration(permissions),
        mostUsedPermissions: this.getMostUsedPermissions(permissions),
        riskDistribution: this.getRiskDistribution(permissions)
      };

      return analytics;

    } catch (error) {
      this.logger.error('Failed to get permission analytics', error, { userId });
      throw error;
    }
  }

  // Private helper methods
  private async evaluatePermissionConditions(
    permission: IPermission,
    request: PermissionRequest,
    marketData: MarketCondition
  ): Promise<PermissionEvaluationResult> {
    const triggeredConditions: string[] = [];
    let riskLevel: 'low' | 'medium' | 'high' = 'low';

    // Check amount limits
    const requestedAmount = parseFloat(request.requestedAmount);
    const maxAmount = parseFloat(permission.scope.maxAmount);
    
    if (requestedAmount > maxAmount) {
      return {
        isAllowed: false,
        reason: `Requested amount ${requestedAmount} exceeds maximum ${maxAmount}`,
        triggeredConditions: ['amount_limit'],
        requiresCommunityVote: false,
        riskLevel: 'high'
      };
    }

    // Check percentage limits
    const maxPercentage = permission.scope.maxPercentage;
    // This would need portfolio value to calculate percentage
    // For now, we'll assume it's within limits

    // Evaluate conditions
    for (const condition of permission.conditions) {
      if (!condition.isActive) continue;

      const conditionResult = await this.evaluateCondition(condition, marketData, request);
      
      if (conditionResult.triggered) {
        triggeredConditions.push(condition.id);
        
        if (conditionResult.blocksAction) {
          return {
            isAllowed: false,
            reason: conditionResult.reason,
            triggeredConditions,
            requiresCommunityVote: false,
            riskLevel: conditionResult.riskLevel
          };
        }

        if (conditionResult.riskLevel === 'high') {
          riskLevel = 'high';
        } else if (conditionResult.riskLevel === 'medium' && riskLevel !== 'high') {
          riskLevel = 'medium';
        }
      }
    }

    // Check time windows
    const isInTimeWindow = this.isInTimeWindow(permission.scope.timeWindows);
    if (!isInTimeWindow) {
      return {
        isAllowed: false,
        reason: 'Action not allowed outside of permitted time windows',
        triggeredConditions: [...triggeredConditions, 'time_window'],
        requiresCommunityVote: false,
        riskLevel: 'medium'
      };
    }

    // Check frequency limits
    const frequencyCheck = await this.checkFrequencyLimits(permission, request);
    if (!frequencyCheck.allowed) {
      return {
        isAllowed: false,
        reason: frequencyCheck.reason,
        triggeredConditions: [...triggeredConditions, 'frequency_limit'],
        requiresCommunityVote: false,
        riskLevel: 'medium'
      };
    }

    return {
      isAllowed: true,
      triggeredConditions,
      requiresCommunityVote: riskLevel === 'high',
      riskLevel
    };
  }

  private async evaluateCondition(
    condition: PermissionCondition,
    marketData: MarketCondition,
    request: PermissionRequest
  ): Promise<{
    triggered: boolean;
    blocksAction: boolean;
    reason?: string;
    riskLevel: 'low' | 'medium' | 'high';
  }> {
    switch (condition.type) {
      case 'volatility_threshold':
        return this.evaluateVolatilityCondition(condition, marketData);
      
      case 'price_change':
        return this.evaluatePriceChangeCondition(condition, marketData);
      
      case 'market_condition':
        return this.evaluateMarketCondition(condition, marketData);
      
      case 'risk_metrics':
        return this.evaluateRiskMetricsCondition(condition, marketData);
      
      default:
        return {
          triggered: false,
          blocksAction: false,
          riskLevel: 'low'
        };
    }
  }

  private evaluateVolatilityCondition(
    condition: PermissionCondition,
    marketData: MarketCondition
  ): { triggered: boolean; blocksAction: boolean; reason?: string; riskLevel: 'low' | 'medium' | 'high' } {
    const threshold = condition.parameters.threshold as number;
    
    if (marketData.volatility > threshold) {
      return {
        triggered: true,
        blocksAction: true,
        reason: `Market volatility ${marketData.volatility} exceeds threshold ${threshold}`,
        riskLevel: 'high'
      };
    }

    return {
      triggered: false,
      blocksAction: false,
      riskLevel: 'low'
    };
  }

  private evaluatePriceChangeCondition(
    condition: PermissionCondition,
    marketData: MarketCondition
  ): { triggered: boolean; blocksAction: boolean; reason?: string; riskLevel: 'low' | 'medium' | 'high' } {
    const threshold = condition.parameters.threshold as number;
    const direction = condition.parameters.direction as 'up' | 'down' | 'both';
    
    // This would need historical price data
    // For now, we'll simulate based on market trend
    let priceChange = 0;
    if (marketData.trend === 'bearish') priceChange = -0.1; // -10%
    if (marketData.trend === 'bullish') priceChange = 0.1; // +10%
    
    if (Math.abs(priceChange) > threshold) {
      return {
        triggered: true,
        blocksAction: direction === 'both' || 
                     (direction === 'up' && priceChange > 0) ||
                     (direction === 'down' && priceChange < 0),
        reason: `Price change ${priceChange} exceeds threshold ${threshold}`,
        riskLevel: Math.abs(priceChange) > threshold * 2 ? 'high' : 'medium'
      };
    }

    return {
      triggered: false,
      blocksAction: false,
      riskLevel: 'low'
    };
  }

  private evaluateMarketCondition(
    condition: PermissionCondition,
    marketData: MarketCondition
  ): { triggered: boolean; blocksAction: boolean; reason?: string; riskLevel: 'low' | 'medium' | 'high' } {
    const allowedConditions = condition.parameters.allowedConditions as string[];
    
    if (!allowedConditions.includes(marketData.trend)) {
      return {
        triggered: true,
        blocksAction: true,
        reason: `Market condition ${marketData.trend} not allowed`,
        riskLevel: 'medium'
      };
    }

    return {
      triggered: false,
      blocksAction: false,
      riskLevel: 'low'
    };
  }

  private evaluateRiskMetricsCondition(
    condition: PermissionCondition,
    marketData: MarketCondition
  ): { triggered: boolean; blocksAction: boolean; reason?: string; riskLevel: 'low' | 'medium' | 'high' } {
    const maxRisk = condition.parameters.maxRisk as number;
    
    // Calculate current risk score based on market conditions
    const currentRisk = marketData.volatility * 100; // Simplified risk calculation
    
    if (currentRisk > maxRisk) {
      return {
        triggered: true,
        blocksAction: true,
        reason: `Current risk ${currentRisk} exceeds maximum ${maxRisk}`,
        riskLevel: 'high'
      };
    }

    return {
      triggered: false,
      blocksAction: false,
      riskLevel: currentRisk > maxRisk * 0.8 ? 'medium' : 'low'
    };
  }

  private isInTimeWindow(timeWindows: IPermission['scope']['timeWindows']): boolean {
    if (timeWindows.length === 0) return true;

    const now = new Date();
    const currentDay = now.getDay();
    const currentTime = now.getHours() * 60 + now.getMinutes();

    return timeWindows.some(window => {
      const isDayAllowed = window.days.includes(currentDay);
      if (!isDayAllowed) return false;

      const startTime = this.parseTime(window.start);
      const endTime = this.parseTime(window.end);

      return currentTime >= startTime && currentTime <= endTime;
    });
  }

  private parseTime(timeString: string): number {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
  }

  private async checkFrequencyLimits(
    permission: IPermission,
    request: PermissionRequest
  ): Promise<{ allowed: boolean; reason?: string }> {
    // This would check against transaction history
    // For now, we'll return allowed
    return { allowed: true };
  }

  private shouldRequireCommunityVote(
    request: PermissionRequest,
    marketData: MarketCondition,
    result: PermissionEvaluationResult
  ): boolean {
    // Require community vote for high-risk actions
    if (result.riskLevel === 'high') return true;
    
    // Require community vote for large amounts
    const requestedAmount = parseFloat(request.requestedAmount);
    if (requestedAmount > 10000) return true; // $10,000 threshold
    
    // Require community vote during high volatility
    if (marketData.volatility > 0.4) return true;
    
    // Require community vote for emergency actions
    if (request.action === 'emergency') return true;

    return false;
  }

  private async shouldAutoRevoke(
    permission: IPermission,
    marketData: MarketCondition
  ): Promise<{ should: boolean; reason: string }> {
    // Auto-revoke during extreme market conditions
    if (marketData.volatility > 0.6) {
      return {
        should: true,
        reason: `Auto-revoked due to extreme market volatility: ${marketData.volatility}`
      };
    }

    // Auto-revoke if permission has expired
    if (permission.expiresAt && permission.expiresAt <= new Date()) {
      return {
        should: true,
        reason: 'Permission has expired'
      };
    }

    return { should: false, reason: '' };
  }

  private checkConsensus(votes: CommunityVote[], threshold: number): boolean {
    if (votes.length < 3) return false; // Minimum 3 votes required

    const approvalRate = this.calculateApprovalRate(votes);
    return approvalRate >= threshold || approvalRate <= (1 - threshold);
  }

  private calculateApprovalRate(votes: CommunityVote[]): number {
    const approvals = votes.filter(v => v.vote === 'approve').length;
    return approvals / votes.length;
  }

  private calculateAverageDuration(permissions: IPermission[]): number {
    const durations = permissions
      .filter(p => p.status === PermissionStatus.REVOKED || p.status === PermissionStatus.EXPIRED)
      .map(p => {
        const start = p.grantedAt.getTime();
        const end = (p.revokedAt || p.expiresAt || new Date()).getTime();
        return (end - start) / (1000 * 60 * 60 * 24); // Days
      });

    return durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;
  }

  private getMostUsedPermissions(permissions: IPermission[]): Array<{ type: PermissionType; count: number }> {
    const typeCounts = permissions.reduce((acc, p) => {
      acc[p.type] = (acc[p.type] || 0) + 1;
      return acc;
    }, {} as Record<PermissionType, number>);

    return Object.entries(typeCounts)
      .map(([type, count]) => ({ type: type as PermissionType, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }

  private getRiskDistribution(permissions: IPermission[]): Record<string, number> {
    const distribution = { low: 0, medium: 0, high: 0 };
    
    permissions.forEach(p => {
      distribution[p.metadata.riskLevel]++;
    });

    return distribution;
  }

  private generateConditionId(): string {
    return `cond_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
