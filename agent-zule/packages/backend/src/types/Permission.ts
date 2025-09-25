import { PermissionStatus } from './Common';

export interface Permission {
  id: string;
  userId: string;
  agentId: string;
  type: PermissionType;
  scope: PermissionScope;
  conditions: PermissionCondition[];
  status: PermissionStatus;
  grantedAt: Date;
  expiresAt?: Date;
  revokedAt?: Date;
  metadata: PermissionMetadata;
  auditLog: PermissionAuditEntry[];
}

export enum PermissionType {
  TRADE_EXECUTION = 'trade_execution',
  PORTFOLIO_REBALANCING = 'portfolio_rebalancing',
  YIELD_OPTIMIZATION = 'yield_optimization',
  DCA_EXECUTION = 'dca_execution',
  RISK_MANAGEMENT = 'risk_management',
  EMERGENCY_ACTIONS = 'emergency_actions'
}

export interface PermissionScope {
  tokens: string[]; // Token addresses
  maxAmount: string; // Maximum amount per transaction
  maxPercentage: number; // Maximum percentage of portfolio
  timeWindows: TimeWindow[];
  frequency: FrequencyLimit;
}

export interface TimeWindow {
  start: string; // HH:MM format
  end: string; // HH:MM format
  days: number[]; // 0-6 (Sunday-Saturday)
  timezone: string;
}

export interface FrequencyLimit {
  maxTransactions: number;
  period: 'hour' | 'day' | 'week' | 'month';
  resetTime?: string; // When the limit resets
}

export interface PermissionCondition {
  id: string;
  type: ConditionType;
  parameters: Record<string, any>;
  operator: 'and' | 'or';
  priority: number;
  isActive: boolean;
}

export enum ConditionType {
  VOLATILITY_THRESHOLD = 'volatility_threshold',
  PRICE_CHANGE = 'price_change',
  VOLUME_THRESHOLD = 'volume_threshold',
  MARKET_CONDITION = 'market_condition',
  PORTFOLIO_VALUE = 'portfolio_value',
  TIME_BASED = 'time_based',
  COMMUNITY_CONSENSUS = 'community_consensus',
  RISK_METRICS = 'risk_metrics'
}

export interface PermissionMetadata {
  description: string;
  riskLevel: 'low' | 'medium' | 'high';
  autoRenew: boolean;
  requiresConfirmation: boolean;
  communityVotingEnabled: boolean;
  escalationThreshold: number;
  version: string;
}

export interface PermissionAuditEntry {
  id: string;
  action: 'granted' | 'revoked' | 'modified' | 'condition_triggered' | 'escalated';
  details: Record<string, any>;
  timestamp: Date;
  triggeredBy: 'user' | 'system' | 'community' | 'ai';
  reason?: string;
}

export interface ConditionalPermission {
  id: string;
  basePermissionId: string;
  conditions: DynamicCondition[];
  adaptations: PermissionAdaptation[];
  isActive: boolean;
  lastEvaluated: Date;
}

export interface DynamicCondition {
  id: string;
  type: 'market_volatility' | 'price_movement' | 'volume_spike' | 'risk_metrics';
  threshold: number;
  operator: 'greater_than' | 'less_than' | 'equals' | 'between';
  duration: number; // Minutes
  action: 'restrict' | 'expand' | 'revoke' | 'escalate';
}

export interface PermissionAdaptation {
  type: 'reduce_scope' | 'increase_scope' | 'add_condition' | 'remove_condition';
  parameters: Record<string, any>;
  duration?: number; // How long this adaptation lasts
  priority: number;
}

export interface CommunityVote {
  id: string;
  permissionId: string;
  proposal: PermissionProposal;
  votes: Vote[];
  status: 'active' | 'passed' | 'rejected' | 'expired';
  createdAt: Date;
  expiresAt: Date;
  requiredVotes: number;
  currentVotes: number;
}

export interface PermissionProposal {
  type: 'grant' | 'revoke' | 'modify' | 'escalate';
  details: Record<string, any>;
  reasoning: string;
  proposedBy: string;
  riskAssessment: string;
}

export interface Vote {
  userId: string;
  vote: 'approve' | 'reject' | 'abstain';
  reasoning?: string;
  timestamp: Date;
}

export interface PermissionTemplate {
  id: string;
  name: string;
  description: string;
  type: PermissionType;
  defaultScope: PermissionScope;
  defaultConditions: PermissionCondition[];
  riskLevel: 'low' | 'medium' | 'high';
  category: 'conservative' | 'moderate' | 'aggressive';
  isPublic: boolean;
  createdBy: string;
  usageCount: number;
}

export interface PermissionAnalytics {
  totalPermissions: number;
  activePermissions: number;
  revokedPermissions: number;
  expiredPermissions: number;
  averageDuration: number;
  mostUsedTypes: PermissionTypeUsage[];
  conditionTriggerFrequency: ConditionTriggerStats[];
  communityVotingStats: CommunityVotingStats;
}

export interface PermissionTypeUsage {
  type: PermissionType;
  count: number;
  averageDuration: number;
  successRate: number;
}

export interface ConditionTriggerStats {
  conditionType: ConditionType;
  triggerCount: number;
  averageThreshold: number;
  mostCommonAction: string;
}

export interface CommunityVotingStats {
  totalVotes: number;
  approvalRate: number;
  averageParticipation: number;
  averageDecisionTime: number;
}
