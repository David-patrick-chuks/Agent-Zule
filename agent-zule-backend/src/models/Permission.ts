import mongoose, { Document, Schema } from 'mongoose';
import { ConditionType, PermissionStatus, PermissionType } from '../types/Permission';

export interface IPermission extends Document {
  userId: string;
  agentId: string;
  type: PermissionType;
  scope: {
    tokens: string[];
    maxAmount: string;
    maxPercentage: number;
    timeWindows: TimeWindow[];
    frequency: FrequencyLimit;
  };
  conditions: PermissionCondition[];
  status: PermissionStatus;
  grantedAt: Date;
  expiresAt?: Date;
  revokedAt?: Date;
  metadata: {
    description: string;
    riskLevel: 'low' | 'medium' | 'high';
    autoRenew: boolean;
    requiresConfirmation: boolean;
    communityVotingEnabled: boolean;
    escalationThreshold: number;
    version: string;
    votes?: any[];
  };
  auditLog: PermissionAuditEntry[];
  createdAt: Date;
  updatedAt: Date;
  
  // Instance methods
  addAuditEntry(entry: Omit<PermissionAuditEntry, 'id'>): Promise<IPermission>;
  revoke(reason: string, triggeredBy?: 'user' | 'system' | 'community' | 'ai'): Promise<IPermission>;
  grant(): Promise<IPermission>;
  addCondition(condition: Omit<PermissionCondition, 'id'>): Promise<IPermission>;
  removeCondition(conditionId: string): Promise<IPermission>;
  updateCondition(conditionId: string, updates: Partial<PermissionCondition>): Promise<IPermission>;
}

export interface IPermissionModel extends mongoose.Model<IPermission> {
  findByUserId(userId: string, status?: PermissionStatus): Promise<IPermission[]>;
  findActivePermissions(userId?: string): Promise<IPermission[]>;
  findExpiredPermissions(): Promise<IPermission[]>;
  findByType(type: PermissionType, status?: PermissionStatus): Promise<IPermission[]>;
  findDueForRenewal(): Promise<IPermission[]>;
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
  resetTime?: string;
}

export interface PermissionCondition {
  id: string;
  type: ConditionType;
  parameters: Record<string, any>;
  operator: 'and' | 'or';
  priority: number;
  isActive: boolean;
}

export interface PermissionAuditEntry {
  id: string;
  action: 'granted' | 'revoked' | 'modified' | 'condition_triggered' | 'escalated';
  details: Record<string, any>;
  timestamp: Date;
  triggeredBy: 'user' | 'system' | 'community' | 'ai';
  reason?: string;
}

const TimeWindowSchema = new Schema({
  start: { type: String, required: true },
  end: { type: String, required: true },
  days: [{ type: Number, min: 0, max: 6 }],
  timezone: { type: String, default: 'UTC' }
}, { _id: false });

const FrequencyLimitSchema = new Schema({
  maxTransactions: { type: Number, required: true, min: 1 },
  period: {
    type: String,
    enum: ['hour', 'day', 'week', 'month'],
    required: true
  },
  resetTime: String
}, { _id: false });

const PermissionConditionSchema = new Schema({
  id: { type: String, required: true },
  type: {
    type: String,
    enum: ['volatility_threshold', 'price_change', 'volume_threshold', 'market_condition', 'portfolio_value', 'time_based', 'community_consensus', 'risk_metrics'],
    required: true
  },
  parameters: { type: Schema.Types.Mixed, required: true },
  operator: {
    type: String,
    enum: ['and', 'or'],
    default: 'and'
  },
  priority: { type: Number, default: 1 },
  isActive: { type: Boolean, default: true }
}, { _id: false });

const PermissionAuditEntrySchema = new Schema({
  id: { type: String, required: true },
  action: {
    type: String,
    enum: ['granted', 'revoked', 'modified', 'condition_triggered', 'escalated'],
    required: true
  },
  details: { type: Schema.Types.Mixed, required: true },
  timestamp: { type: Date, required: true },
  triggeredBy: {
    type: String,
    enum: ['user', 'system', 'community', 'ai'],
    required: true
  },
  reason: String
}, { _id: false });

const PermissionSchema = new Schema<IPermission>({
  userId: {
    type: String,
    required: true
  },
  agentId: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['trade_execution', 'portfolio_rebalancing', 'yield_optimization', 'dca_execution', 'risk_management', 'emergency_actions'],
    required: true
  },
  scope: {
    tokens: [String],
    maxAmount: { type: String, required: true },
    maxPercentage: { type: Number, required: true, min: 0, max: 1 },
    timeWindows: [TimeWindowSchema],
    frequency: {
      type: FrequencyLimitSchema,
      required: true
    }
  },
  conditions: [PermissionConditionSchema],
  status: {
    type: String,
    enum: Object.values(PermissionStatus),
    default: PermissionStatus.PENDING
  },
  grantedAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date
  },
  revokedAt: Date,
  metadata: {
    description: { type: String, required: true },
    riskLevel: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium'
    },
    autoRenew: { type: Boolean, default: false },
    requiresConfirmation: { type: Boolean, default: false },
    communityVotingEnabled: { type: Boolean, default: true },
    escalationThreshold: { type: Number, default: 0.8 },
    version: { type: String, default: '1.0.0' },
    votes: [Schema.Types.Mixed]
  },
  auditLog: [PermissionAuditEntrySchema]
}, {
  timestamps: true,
  collection: 'permissions'
});

// Indexes
PermissionSchema.index({ userId: 1 });
PermissionSchema.index({ agentId: 1 });
PermissionSchema.index({ type: 1 });
PermissionSchema.index({ status: 1 });
PermissionSchema.index({ grantedAt: -1 });
PermissionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Compound indexes
PermissionSchema.index({ userId: 1, status: 1 });
PermissionSchema.index({ userId: 1, type: 1 });
PermissionSchema.index({ status: 1, expiresAt: 1 });

// Virtual methods removed due to TypeScript compatibility issues

// Methods
PermissionSchema.methods.addAuditEntry = function(entry: Omit<PermissionAuditEntry, 'id'>) {
  const auditEntry: PermissionAuditEntry = {
    id: new mongoose.Types.ObjectId().toString(),
    ...entry
  };
  this.auditLog.push(auditEntry);
  return this.save();
};

PermissionSchema.methods.revoke = function(reason: string, triggeredBy: 'user' | 'system' | 'community' | 'ai' = 'user') {
  this.status = PermissionStatus.REVOKED;
  this.revokedAt = new Date();
  this.addAuditEntry({
    action: 'revoked',
    details: { reason },
    timestamp: new Date(),
    triggeredBy,
    reason
  });
  return this.save();
};

PermissionSchema.methods.grant = function() {
  this.status = PermissionStatus.ACTIVE;
  this.grantedAt = new Date();
  this.addAuditEntry({
    action: 'granted',
    details: {},
    timestamp: new Date(),
    triggeredBy: 'user'
  });
  return this.save();
};

PermissionSchema.methods.addCondition = function(condition: Omit<PermissionCondition, 'id'>) {
  const newCondition: PermissionCondition = {
    id: new mongoose.Types.ObjectId().toString(),
    ...condition
  };
  this.conditions.push(newCondition);
  return this.save();
};

PermissionSchema.methods.removeCondition = function(conditionId: string) {
  this.conditions = this.conditions.filter(c => c.id !== conditionId);
  return this.save();
};

PermissionSchema.methods.updateCondition = function(conditionId: string, updates: Partial<PermissionCondition>) {
  const condition = this.conditions.find(c => c.id === conditionId);
  if (condition) {
    Object.assign(condition, updates);
  }
  return this.save();
};

// Static methods
PermissionSchema.statics.findByUserId = function(userId: string, status?: PermissionStatus) {
  const query: any = { userId };
  if (status) query.status = status;
  return this.find(query).sort({ createdAt: -1 });
};

PermissionSchema.statics.findActivePermissions = function(userId?: string) {
  const query: any = { status: PermissionStatus.ACTIVE };
  if (userId) query.userId = userId;
  return this.find(query);
};

PermissionSchema.statics.findExpiredPermissions = function() {
  return this.find({
    expiresAt: { $lte: new Date() },
    status: PermissionStatus.ACTIVE
  });
};

PermissionSchema.statics.findByType = function(type: PermissionType, status?: PermissionStatus) {
  const query: any = { type };
  if (status) query.status = status;
  return this.find(query);
};

PermissionSchema.statics.findDueForRenewal = function() {
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
  
  return this.find({
    status: PermissionStatus.ACTIVE,
    'metadata.autoRenew': true,
    expiresAt: { $lte: thirtyDaysFromNow }
  });
};

// Pre-save middleware removed due to TypeScript compatibility issues

export const Permission = mongoose.model<IPermission, IPermissionModel>('Permission', PermissionSchema);
