import mongoose, { Document, Schema } from 'mongoose';
import { Position, PortfolioMetrics, PortfolioStrategy, RiskProfile } from '../types/Portfolio';

export interface IPortfolio extends Document {
  userId: string;
  name: string;
  description?: string;
  positions: Position[];
  metrics: PortfolioMetrics;
  strategy: PortfolioStrategy;
  riskProfile: RiskProfile;
  isActive: boolean;
  lastRebalanced?: Date;
  nextRebalancingDate?: Date;
  metadata: {
    tags: string[];
    isPublic: boolean;
    benchmark: string;
    performanceTarget: number;
  };
  history: {
    snapshots: PortfolioSnapshot[];
    changes: PortfolioChange[];
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface PortfolioSnapshot {
  timestamp: Date;
  positions: Position[];
  metrics: PortfolioMetrics;
  totalValue: number;
}

export interface PortfolioChange {
  id: string;
  type: 'buy' | 'sell' | 'swap' | 'rebalance' | 'deposit' | 'withdrawal';
  token: string;
  amount: string;
  value: number;
  price: number;
  timestamp: Date;
  reason?: string;
  gasUsed?: number;
  transactionHash?: string;
}

const PositionSchema = new Schema({
  token: {
    address: { type: String, required: true },
    symbol: { type: String, required: true },
    name: { type: String, required: true },
    decimals: { type: Number, required: true },
    price: { type: Number, required: true },
    marketCap: Number,
    volume24h: Number
  },
  amount: { type: String, required: true },
  value: { type: Number, required: true },
  allocation: { type: Number, required: true },
  entryPrice: Number,
  currentPrice: { type: Number, required: true },
  pnl: Number,
  pnlPercentage: Number
}, { _id: false });

const PortfolioMetricsSchema = new Schema({
  totalValue: { type: Number, required: true },
  totalPnl: { type: Number, required: true },
  totalPnlPercentage: { type: Number, required: true },
  riskScore: { type: Number, required: true, min: 0, max: 100 },
  sharpeRatio: Number,
  maxDrawdown: Number,
  volatility: Number,
  lastUpdated: { type: Date, default: Date.now }
}, { _id: false });

const PortfolioStrategySchema = new Schema({
  type: {
    type: String,
    enum: ['conservative', 'moderate', 'aggressive', 'custom'],
    default: 'moderate'
  },
  rebalancingFrequency: {
    type: String,
    enum: ['daily', 'weekly', 'monthly', 'quarterly'],
    default: 'weekly'
  },
  maxPositionSize: { type: Number, default: 0.1, min: 0, max: 1 },
  minPositionSize: { type: Number, default: 0.01, min: 0, max: 1 },
  allowedTokens: [String],
  blacklistedTokens: [String],
  yieldOptimizationEnabled: { type: Boolean, default: true },
  dcaEnabled: { type: Boolean, default: false },
  stopLossEnabled: { type: Boolean, default: false },
  stopLossPercentage: { type: Number, min: 0, max: 1 }
}, { _id: false });

const RiskProfileSchema = new Schema({
  tolerance: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  maxDrawdown: { type: Number, default: 0.2, min: 0, max: 1 },
  volatilityThreshold: { type: Number, default: 0.3, min: 0 },
  correlationLimit: { type: Number, default: 0.7, min: 0, max: 1 },
  diversificationTarget: { type: Number, default: 0.8, min: 0, max: 1 },
  hedgingEnabled: { type: Boolean, default: false }
}, { _id: false });

const PortfolioSnapshotSchema = new Schema({
  timestamp: { type: Date, required: true },
  positions: [PositionSchema],
  metrics: PortfolioMetricsSchema,
  totalValue: { type: Number, required: true }
}, { _id: false });

const PortfolioChangeSchema = new Schema({
  id: { type: String, required: true },
  type: {
    type: String,
    enum: ['buy', 'sell', 'swap', 'rebalance', 'deposit', 'withdrawal'],
    required: true
  },
  token: { type: String, required: true },
  amount: { type: String, required: true },
  value: { type: Number, required: true },
  price: { type: Number, required: true },
  timestamp: { type: Date, required: true },
  reason: String,
  gasUsed: Number,
  transactionHash: String
}, { _id: false });

const PortfolioSchema = new Schema<IPortfolio>({
  userId: {
    type: String,
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  positions: [PositionSchema],
  metrics: {
    type: PortfolioMetricsSchema,
    required: true
  },
  strategy: {
    type: PortfolioStrategySchema,
    required: true
  },
  riskProfile: {
    type: RiskProfileSchema,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  lastRebalanced: Date,
  nextRebalancingDate: Date,
  metadata: {
    tags: [String],
    isPublic: { type: Boolean, default: false },
    benchmark: { type: String, default: 'BTC' },
    performanceTarget: { type: Number, default: 0.1 }
  },
  history: {
    snapshots: [PortfolioSnapshotSchema],
    changes: [PortfolioChangeSchema]
  }
}, {
  timestamps: true,
  collection: 'portfolios'
});

// Indexes
PortfolioSchema.index({ userId: 1 });
PortfolioSchema.index({ isActive: 1 });
PortfolioSchema.index({ createdAt: -1 });
PortfolioSchema.index({ 'metrics.lastUpdated': -1 });
PortfolioSchema.index({ 'strategy.type': 1 });

// Virtual for total invested amount
PortfolioSchema.virtual('totalInvested').get(function() {
  return this.positions.reduce((sum, position) => sum + (position.entryPrice ? parseFloat(position.amount) * position.entryPrice : position.value), 0);
});

// Virtual for current allocation sum
PortfolioSchema.virtual('allocationSum').get(function() {
  return this.positions.reduce((sum, position) => sum + position.allocation, 0);
});

// Methods
PortfolioSchema.methods.addSnapshot = function(snapshot: PortfolioSnapshot) {
  this.history.snapshots.push(snapshot);
  // Keep only last 100 snapshots
  if (this.history.snapshots.length > 100) {
    this.history.snapshots = this.history.snapshots.slice(-100);
  }
  return this.save();
};

PortfolioSchema.methods.addChange = function(change: PortfolioChange) {
  this.history.changes.push(change);
  // Keep only last 1000 changes
  if (this.history.changes.length > 1000) {
    this.history.changes = this.history.changes.slice(-1000);
  }
  return this.save();
};

PortfolioSchema.methods.updateMetrics = function(newMetrics: PortfolioMetrics) {
  this.metrics = { ...this.metrics, ...newMetrics, lastUpdated: new Date() };
  return this.save();
};

PortfolioSchema.methods.rebalance = function() {
  this.lastRebalanced = new Date();
  // Calculate next rebalancing date based on strategy
  const frequencies = {
    daily: 24 * 60 * 60 * 1000,
    weekly: 7 * 24 * 60 * 60 * 1000,
    monthly: 30 * 24 * 60 * 60 * 1000,
    quarterly: 90 * 24 * 60 * 60 * 1000
  };
  this.nextRebalancingDate = new Date(Date.now() + frequencies[this.strategy.rebalancingFrequency]);
  return this.save();
};

// Static methods
PortfolioSchema.statics.findByUserId = function(userId: string) {
  return this.find({ userId, isActive: true });
};

PortfolioSchema.statics.findPublicPortfolios = function() {
  return this.find({ 'metadata.isPublic': true, isActive: true });
};

PortfolioSchema.statics.findDueForRebalancing = function() {
  return this.find({
    isActive: true,
    $or: [
      { nextRebalancingDate: { $lte: new Date() } },
      { nextRebalancingDate: { $exists: false } }
    ]
  });
};

// Pre-save middleware
PortfolioSchema.pre('save', function(next) {
  // Validate allocation sum
  const allocationSum = this.positions.reduce((sum, position) => sum + position.allocation, 0);
  if (Math.abs(allocationSum - 1) > 0.01) {
    return next(new Error('Portfolio allocation must sum to 1.0'));
  }
  
  // Update metrics timestamp
  if (this.isModified('positions')) {
    this.metrics.lastUpdated = new Date();
  }
  
  next();
});

export const Portfolio = mongoose.model<IPortfolio>('Portfolio', PortfolioSchema);
