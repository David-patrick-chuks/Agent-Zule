import * as cron from 'node-cron';
import { Permission } from '../../models/Permission';
import { MarketCondition } from '../../types/Common';
import { PermissionStatus } from '../../types/Permission';
import { Logger } from '../../utils/Logger';
import { PermissionManager } from './PermissionManager';

export interface AutoRevokeRule {
  id: string;
  name?: string;
  condition: string;
  threshold: number;
  action: 'revoke' | 'restrict' | 'escalate';
  severity: 'low' | 'medium' | 'high' | 'critical';
  isActive: boolean;
  createdAt: Date;
}

export interface AutoRevokeEvent {
  id: string;
  ruleId: string;
  permissionId: string;
  userId: string;
  action: 'revoked' | 'restricted' | 'escalated';
  reason: string;
  marketData: MarketCondition;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export class AutoRevokeService {
  private static instance: AutoRevokeService;
  private logger = Logger.getInstance();
  private permissionManager = PermissionManager.getInstance();
  private isRunning = false;
  private cronJob?: cron.ScheduledTask | null;

  // Auto-revoke rules
  private rules: AutoRevokeRule[] = [
    {
      id: 'volatility_extreme',
      name: 'Extreme Volatility Protection',
      condition: 'market_volatility',
      threshold: 0.6, // 60% volatility
      action: 'revoke',
      severity: 'critical',
      isActive: true,
      createdAt: new Date()
    },
    {
      id: 'volatility_high',
      name: 'High Volatility Restriction',
      condition: 'market_volatility',
      threshold: 0.4, // 40% volatility
      action: 'restrict',
      severity: 'high',
      isActive: true,
      createdAt: new Date()
    },
    {
      id: 'bear_market',
      name: 'Bear Market Protection',
      condition: 'market_trend',
      threshold: -0.2, // -20% trend
      action: 'escalate',
      severity: 'high',
      isActive: true,
      createdAt: new Date()
    },
    {
      id: 'liquidity_crisis',
      name: 'Liquidity Crisis Protection',
      condition: 'liquidity_ratio',
      threshold: 0.1, // 10% liquidity
      action: 'revoke',
      severity: 'critical',
      isActive: true,
      createdAt: new Date()
    }
  ];

  private constructor() {}

  public static getInstance(): AutoRevokeService {
    if (!AutoRevokeService.instance) {
      AutoRevokeService.instance = new AutoRevokeService();
    }
    return AutoRevokeService.instance;
  }

  /**
   * Start the auto-revoke service with scheduled monitoring
   */
  public start(): void {
    if (this.isRunning) {
      this.logger.warn('AutoRevokeService is already running');
      return;
    }

    this.logger.info('Starting AutoRevokeService...');

    // Run every 5 minutes
    this.cronJob = cron.schedule('*/5 * * * *', async () => {
      try {
        await this.monitorAndAutoRevoke();
      } catch (error) {
        this.logger.error('Auto-revoke monitoring failed', error);
      }
    });

    this.isRunning = true;
    this.logger.info('AutoRevokeService started successfully');
  }

  /**
   * Stop the auto-revoke service
   */
  public stop(): void {
    if (!this.isRunning) {
      this.logger.warn('AutoRevokeService is not running');
      return;
    }

    if (this.cronJob) {
      this.cronJob.destroy();
      this.cronJob = undefined;
    }

    this.isRunning = false;
    this.logger.info('AutoRevokeService stopped');
  }

  /**
   * Manually trigger auto-revoke check
   */
  public async triggerAutoRevoke(marketData: MarketCondition): Promise<{
    events: AutoRevokeEvent[];
    revokedCount: number;
    restrictedCount: number;
    escalatedCount: number;
  }> {
    try {
      this.logger.logAI('AutoRevokeService', 'manual_trigger', {
        marketVolatility: marketData.volatility,
        marketTrend: marketData.trend
      });

      const events: AutoRevokeEvent[] = [];
      let revokedCount = 0;
      let restrictedCount = 0;
      let escalatedCount = 0;

      // Get all active permissions
      const activePermissions = await Permission.find({
        status: PermissionStatus.ACTIVE
      }).populate('userId');

      for (const permission of activePermissions) {
        const ruleResults = await this.evaluateRules(permission, marketData);

        for (const result of ruleResults) {
          if (result.shouldTrigger) {
            const event = await this.executeRule(permission, result.rule, marketData);
            events.push(event);

            switch (result.rule.action) {
              case 'revoke':
                revokedCount++;
                break;
              case 'restrict':
                restrictedCount++;
                break;
              case 'escalate':
                escalatedCount++;
                break;
            }
          }
        }
      }

      this.logger.logAI('AutoRevokeService', 'trigger_completed', {
        totalEvents: events.length,
        revokedCount,
        restrictedCount,
        escalatedCount
      });

      return { events, revokedCount, restrictedCount, escalatedCount };

    } catch (error) {
      this.logger.error('Manual auto-revoke trigger failed', error);
      throw error;
    }
  }

  /**
   * Add a new auto-revoke rule
   */
  public addRule(rule: Omit<AutoRevokeRule, 'id' | 'createdAt'>): AutoRevokeRule {
    const newRule: AutoRevokeRule = {
      ...rule,
      id: this.generateRuleId(),
      createdAt: new Date()
    };

    this.rules.push(newRule);

    this.logger.logAI('AutoRevokeService', 'rule_added', {
      ruleId: newRule.id,
      name: newRule.name,
      condition: newRule.condition
    });

    return newRule;
  }

  /**
   * Update an existing auto-revoke rule
   */
  public updateRule(ruleId: string, updates: Partial<AutoRevokeRule>): AutoRevokeRule | null {
    const ruleIndex = this.rules.findIndex(r => r.id === ruleId);
    if (ruleIndex === -1) {
      return null;
    }

    this.rules[ruleIndex] = {
      ...this.rules[ruleIndex],
      ...updates,
      id: ruleId // Ensure ID doesn't change
    };

    this.logger.logAI('AutoRevokeService', 'rule_updated', {
      ruleId,
      updates
    });

    return this.rules[ruleIndex];
  }

  /**
   * Remove an auto-revoke rule
   */
  public removeRule(ruleId: string): boolean {
    const initialLength = this.rules.length;
    this.rules = this.rules.filter(r => r.id !== ruleId);
    
    const removed = this.rules.length < initialLength;
    
    if (removed) {
      this.logger.logAI('AutoRevokeService', 'rule_removed', { ruleId });
    }

    return removed;
  }

  /**
   * Get all auto-revoke rules
   */
  public getRules(): AutoRevokeRule[] {
    return [...this.rules];
  }

  /**
   * Get auto-revoke analytics
   */
  public async getAnalytics(): Promise<{
    totalRules: number;
    activeRules: number;
    eventsLast24h: number;
    eventsLastWeek: number;
    topTriggeredRules: Array<{ ruleId: string; count: number }>;
    severityDistribution: Record<string, number>;
  }> {
    try {
      // Get events from last 24 hours and week
      const now = new Date();
      const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      // This would query actual events from database
      // For now, we'll return mock data
      const eventsLast24h = 5;
      const eventsLastWeek = 23;

      const topTriggeredRules = [
        { ruleId: 'volatility_extreme', count: 3 },
        { ruleId: 'bear_market', count: 2 },
        { ruleId: 'volatility_high', count: 1 }
      ];

      const severityDistribution = {
        critical: 2,
        high: 3,
        medium: 0,
        low: 0
      };

      return {
        totalRules: this.rules.length,
        activeRules: this.rules.filter(r => r.isActive).length,
        eventsLast24h,
        eventsLastWeek,
        topTriggeredRules,
        severityDistribution
      };

    } catch (error) {
      this.logger.error('Failed to get auto-revoke analytics', error);
      throw error;
    }
  }

  // Private helper methods
  private async monitorAndAutoRevoke(): Promise<void> {
    try {
      // Get current market data (this would come from Envio)
      const marketData: MarketCondition = {
        trend: 'sideways',
        volatility: 0.25,
        liquidity: 0.8,
        volume: 1000000,
        sentiment: 0.5,
        timestamp: new Date()
      };

      await this.triggerAutoRevoke(marketData);

    } catch (error) {
      this.logger.error('Auto-revoke monitoring failed', error);
    }
  }

  private async evaluateRules(
    permission: any,
    marketData: MarketCondition
  ): Promise<Array<{ rule: AutoRevokeRule; shouldTrigger: boolean; value: number }>> {
    const results: Array<{ rule: AutoRevokeRule; shouldTrigger: boolean; value: number }> = [];

    for (const rule of this.rules) {
      if (!rule.isActive) continue;

      const evaluation = this.evaluateRule(rule, marketData, permission);
      results.push({
        rule,
        shouldTrigger: evaluation.shouldTrigger,
        value: evaluation.value
      });
    }

    return results;
  }

  private evaluateRule(
    rule: AutoRevokeRule,
    marketData: MarketCondition,
    permission: any
  ): { shouldTrigger: boolean; value: number } {
    let value = 0;
    let shouldTrigger = false;

    switch (rule.condition) {
      case 'market_volatility':
        value = marketData.volatility;
        shouldTrigger = value > rule.threshold;
        break;

      case 'market_trend':
        // Convert trend to numeric value
        value = marketData.trend === 'bearish' ? -0.3 : 
                marketData.trend === 'bullish' ? 0.3 : 0;
        shouldTrigger = value < rule.threshold;
        break;

      case 'liquidity_ratio':
        value = marketData.liquidity;
        shouldTrigger = value < rule.threshold;
        break;

      case 'permission_age':
        // Check how long permission has been active
        const ageInDays = (Date.now() - permission.grantedAt.getTime()) / (1000 * 60 * 60 * 24);
        value = ageInDays;
        shouldTrigger = value > rule.threshold;
        break;

      case 'transaction_frequency':
        // Check transaction frequency (would need transaction history)
        value = 0; // Placeholder
        shouldTrigger = value > rule.threshold;
        break;

      default:
        this.logger.warn('Unknown auto-revoke condition', { condition: rule.condition });
    }

    return { shouldTrigger, value };
  }

  private async executeRule(
    permission: any,
    rule: AutoRevokeRule,
    marketData: MarketCondition
  ): Promise<AutoRevokeEvent> {
    const eventId = this.generateEventId();
    let action: 'revoked' | 'restricted' | 'escalated';
    let reason = '';

    switch (rule.action) {
      case 'revoke':
        await this.permissionManager.revokePermission(
          permission._id.toString(),
          `Auto-revoked by rule: ${rule.name}`,
          'system'
        );
        action = 'revoked';
        reason = `Permission revoked due to ${rule.name} (threshold: ${rule.threshold})`;
        break;

      case 'restrict':
        // Restrict permission by reducing limits
        await this.restrictPermission(permission, rule);
        action = 'restricted';
        reason = `Permission restricted due to ${rule.name} (threshold: ${rule.threshold})`;
        break;

      case 'escalate':
        // Escalate to community voting
        await this.escalatePermission(permission, rule);
        action = 'escalated';
        reason = `Permission escalated to community due to ${rule.name} (threshold: ${rule.threshold})`;
        break;
    }

    const event: AutoRevokeEvent = {
      id: eventId,
      ruleId: rule.id,
      permissionId: permission._id.toString(),
      userId: permission.userId,
      action,
      reason,
      marketData,
      timestamp: new Date(),
      severity: rule.severity
    };

    this.logger.logAI('AutoRevokeService', 'rule_executed', {
      eventId,
      ruleId: rule.id,
      permissionId: permission._id.toString(),
      action,
      severity: rule.severity
    });

    return event;
  }

  private async restrictPermission(permission: any, rule: AutoRevokeRule): Promise<void> {
    // Reduce permission limits by 50%
    const newMaxAmount = (parseFloat(permission.scope.maxAmount) * 0.5).toString();
    const newMaxPercentage = permission.scope.maxPercentage * 0.5;

    permission.scope.maxAmount = newMaxAmount;
    permission.scope.maxPercentage = newMaxPercentage;

    await permission.save();

    // Add audit entry
    await permission.addAuditEntry({
      action: 'modified',
      details: { 
        restrictedBy: rule.name,
        newMaxAmount,
        newMaxPercentage 
      },
      timestamp: new Date(),
      triggeredBy: 'system',
      reason: `Permission restricted due to ${rule.name}`
    });
  }

  private async escalatePermission(permission: any, rule: AutoRevokeRule): Promise<void> {
    // Enable community voting and reduce threshold
    permission.metadata.communityVotingEnabled = true;
    permission.metadata.escalationThreshold = 0.6; // Lower threshold for faster decision

    await permission.save();

    // Add audit entry
    await permission.addAuditEntry({
      action: 'escalated',
      details: { 
        escalatedBy: rule.name,
        newThreshold: 0.6
      },
      timestamp: new Date(),
      triggeredBy: 'system',
      reason: `Permission escalated to community due to ${rule.name}`
    });
  }

  private generateRuleId(): string {
    return `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateEventId(): string {
    return `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
