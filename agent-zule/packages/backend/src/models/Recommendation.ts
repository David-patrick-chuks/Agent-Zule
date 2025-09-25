import mongoose, { Document, Schema } from 'mongoose';
import { RecommendationType, RiskLevel, RecommendationStatus } from '../types/Recommendation';

export interface IRecommendation extends Document {
  userId: string;
  portfolioId: string;
  type: RecommendationType;
  title: string;
  description: string;
  details: {
    actions: RecommendedAction[];
    estimatedGasCost?: number;
    estimatedSlippage?: number;
    timeHorizon: 'short' | 'medium' | 'long';
    marketConditions: MarketCondition;
  };
  riskLevel: RiskLevel;
  confidence: number;
  expectedImpact: number;
  status: RecommendationStatus;
  communityVotes?: CommunityVote[];
  aiReasoning: AIReasoning;
  expiresAt?: Date;
  executedAt?: Date;
  metadata: {
    source: 'ai_analysis' | 'community_suggestion' | 'user_request';
    priority: 'low' | 'medium' | 'high' | 'urgent';
    tags: string[];
    relatedRecommendations: string[];
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface RecommendedAction {
  type: 'buy' | 'sell' | 'swap' | 'stake' | 'unstake' | 'claim';
  token: {
    address: string;
    symbol: string;
    name: string;
    decimals: number;
    price: number;
  };
  amount: string;
  percentage?: number;
  targetPrice?: number;
  slippageTolerance?: number;
  priority: number;
}

export interface MarketCondition {
  volatility: number;
  trend: 'bullish' | 'bearish' | 'sideways';
  volume: number;
  liquidity: number;
  timestamp: Date;
}

export interface CommunityVote {
  userId: string;
  vote: 'approve' | 'reject' | 'abstain';
  reasoning?: string;
  confidence: number;
  timestamp: Date;
}

export interface AIReasoning {
  dataPoints: DataPoint[];
  analysis: string;
  confidence: number;
  riskFactors: RiskFactor[];
  alternatives: AlternativeOption[];
  model: string;
  version: string;
}

export interface DataPoint {
  source: 'envio' | 'market' | 'portfolio' | 'external';
  type: string;
  value: any;
  weight: number;
  timestamp: Date;
}

export interface RiskFactor {
  name: string;
  impact: 'low' | 'medium' | 'high';
  probability: number;
  description: string;
  mitigation?: string;
}

export interface AlternativeOption {
  description: string;
  expectedReturn: number;
  risk: RiskLevel;
  confidence: number;
  reasoning: string;
}

const RecommendedActionSchema = new Schema({
  type: {
    type: String,
    enum: ['buy', 'sell', 'swap', 'stake', 'unstake', 'claim'],
    required: true
  },
  token: {
    address: { type: String, required: true },
    symbol: { type: String, required: true },
    name: { type: String, required: true },
    decimals: { type: Number, required: true },
    price: { type: Number, required: true }
  },
  amount: { type: String, required: true },
  percentage: Number,
  targetPrice: Number,
  slippageTolerance: Number,
  priority: { type: Number, required: true, min: 1, max: 10 }
}, { _id: false });

const MarketConditionSchema = new Schema({
  volatility: { type: Number, required: true },
  trend: {
    type: String,
    enum: ['bullish', 'bearish', 'sideways'],
    required: true
  },
  volume: { type: Number, required: true },
  liquidity: { type: Number, required: true },
  timestamp: { type: Date, required: true }
}, { _id: false });

const CommunityVoteSchema = new Schema({
  userId: { type: String, required: true },
  vote: {
    type: String,
    enum: ['approve', 'reject', 'abstain'],
    required: true
  },
  reasoning: String,
  confidence: { type: Number, required: true, min: 0, max: 1 },
  timestamp: { type: Date, required: true }
}, { _id: false });

const DataPointSchema = new Schema({
  source: {
    type: String,
    enum: ['envio', 'market', 'portfolio', 'external'],
    required: true
  },
  type: { type: String, required: true },
  value: Schema.Types.Mixed,
  weight: { type: Number, required: true, min: 0, max: 1 },
  timestamp: { type: Date, required: true }
}, { _id: false });

const RiskFactorSchema = new Schema({
  name: { type: String, required: true },
  impact: {
    type: String,
    enum: ['low', 'medium', 'high'],
    required: true
  },
  probability: { type: Number, required: true, min: 0, max: 1 },
  description: { type: String, required: true },
  mitigation: String
}, { _id: false });

const AlternativeOptionSchema = new Schema({
  description: { type: String, required: true },
  expectedReturn: { type: Number, required: true },
  risk: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    required: true
  },
  confidence: { type: Number, required: true, min: 0, max: 1 },
  reasoning: { type: String, required: true }
}, { _id: false });

const AIReasoningSchema = new Schema({
  dataPoints: [DataPointSchema],
  analysis: { type: String, required: true },
  confidence: { type: Number, required: true, min: 0, max: 1 },
  riskFactors: [RiskFactorSchema],
  alternatives: [AlternativeOptionSchema],
  model: { type: String, required: true },
  version: { type: String, required: true }
}, { _id: false });

const RecommendationSchema = new Schema<IRecommendation>({
  userId: {
    type: String,
    required: true,
    index: true
  },
  portfolioId: {
    type: String,
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ['rebalance', 'yield_optimization', 'dca_strategy', 'risk_reduction', 'position_adjustment'],
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  details: {
    actions: [RecommendedActionSchema],
    estimatedGasCost: Number,
    estimatedSlippage: Number,
    timeHorizon: {
      type: String,
      enum: ['short', 'medium', 'long'],
      default: 'medium'
    },
    marketConditions: {
      type: MarketConditionSchema,
      required: true
    }
  },
  riskLevel: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    required: true,
    index: true
  },
  confidence: {
    type: Number,
    required: true,
    min: 0,
    max: 1,
    index: true
  },
  expectedImpact: {
    type: Number,
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'expired', 'executed', 'cancelled'],
    default: 'pending',
    index: true
  },
  communityVotes: [CommunityVoteSchema],
  aiReasoning: {
    type: AIReasoningSchema,
    required: true
  },
  expiresAt: {
    type: Date,
    index: { expireAfterSeconds: 0 }
  },
  executedAt: Date,
  metadata: {
    source: {
      type: String,
      enum: ['ai_analysis', 'community_suggestion', 'user_request'],
      default: 'ai_analysis'
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium'
    },
    tags: [String],
    relatedRecommendations: [String]
  }
}, {
  timestamps: true,
  collection: 'recommendations'
});

// Indexes
RecommendationSchema.index({ userId: 1 });
RecommendationSchema.index({ portfolioId: 1 });
RecommendationSchema.index({ type: 1 });
RecommendationSchema.index({ status: 1 });
RecommendationSchema.index({ riskLevel: 1 });
RecommendationSchema.index({ confidence: -1 });
RecommendationSchema.index({ expectedImpact: -1 });
RecommendationSchema.index({ createdAt: -1 });
RecommendationSchema.index({ expiresAt: 1 });

// Compound indexes
RecommendationSchema.index({ userId: 1, status: 1 });
RecommendationSchema.index({ portfolioId: 1, type: 1 });
RecommendationSchema.index({ status: 1, priority: 1 });

// Virtual for approval rate
RecommendationSchema.virtual('approvalRate').get(function() {
  if (this.communityVotes && this.communityVotes.length > 0) {
    const approvals = this.communityVotes.filter(vote => vote.vote === 'approve').length;
    return approvals / this.communityVotes.length;
  }
  return 0;
});

// Virtual for total votes
RecommendationSchema.virtual('totalVotes').get(function() {
  return this.communityVotes ? this.communityVotes.length : 0;
});

// Methods
RecommendationSchema.methods.addVote = function(vote: CommunityVote) {
  // Remove existing vote from same user
  this.communityVotes = this.communityVotes.filter(v => v.userId !== vote.userId);
  this.communityVotes.push(vote);
  return this.save();
};

RecommendationSchema.methods.execute = function() {
  this.status = RecommendationStatus.EXECUTED;
  this.executedAt = new Date();
  return this.save();
};

RecommendationSchema.methods.reject = function() {
  this.status = RecommendationStatus.REJECTED;
  return this.save();
};

RecommendationSchema.methods.approve = function() {
  this.status = RecommendationStatus.APPROVED;
  return this.save();
};

// Static methods
RecommendationSchema.statics.findByUserId = function(userId: string, status?: RecommendationStatus) {
  const query: any = { userId };
  if (status) query.status = status;
  return this.find(query).sort({ createdAt: -1 });
};

RecommendationSchema.statics.findByPortfolioId = function(portfolioId: string, status?: RecommendationStatus) {
  const query: any = { portfolioId };
  if (status) query.status = status;
  return this.find(query).sort({ createdAt: -1 });
};

RecommendationSchema.statics.findPendingRecommendations = function() {
  return this.find({ status: RecommendationStatus.PENDING }).sort({ priority: 1, createdAt: -1 });
};

RecommendationSchema.statics.findHighConfidenceRecommendations = function(minConfidence: number = 0.8) {
  return this.find({
    confidence: { $gte: minConfidence },
    status: RecommendationStatus.PENDING
  }).sort({ confidence: -1 });
};

RecommendationSchema.statics.findExpiredRecommendations = function() {
  return this.find({
    expiresAt: { $lte: new Date() },
    status: RecommendationStatus.PENDING
  });
};

// Pre-save middleware
RecommendationSchema.pre('save', function(next) {
  // Auto-expire recommendations if expiresAt is set and passed
  if (this.expiresAt && this.expiresAt <= new Date() && this.status === RecommendationStatus.PENDING) {
    this.status = RecommendationStatus.EXPIRED;
  }
  
  // Update updatedAt timestamp
  this.updatedAt = new Date();
  
  next();
});

export const Recommendation = mongoose.model<IRecommendation>('Recommendation', RecommendationSchema);
