import mongoose, { Document, Schema } from 'mongoose';
import { TransactionStatus } from '../types/Common';

export interface ITransaction extends Document {
  userId: string;
  portfolioId: string;
  type: TransactionType;
  status: TransactionStatus;
  details: TransactionDetails;
  execution: ExecutionDetails;
  gas: GasDetails;
  metadata: TransactionMetadata;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

export enum TransactionType {
  BUY = 'buy',
  SELL = 'sell',
  SWAP = 'swap',
  STAKE = 'stake',
  UNSTAKE = 'unstake',
  CLAIM = 'claim',
  REBALANCE = 'rebalance',
  DEPOSIT = 'deposit',
  WITHDRAWAL = 'withdrawal',
  EMERGENCY_STOP = 'emergency_stop'
}

export interface TransactionDetails {
  fromToken?: {
    address: string;
    symbol: string;
    amount: string;
    price: number;
  };
  toToken?: {
    address: string;
    symbol: string;
    amount: string;
    price: number;
  };
  amount: string;
  value: number;
  slippageTolerance?: number;
  deadline?: number;
  reason: string;
  recommendationId?: string;
}

export interface ExecutionDetails {
  hash?: string;
  blockNumber?: number;
  gasUsed?: number;
  gasPrice?: string;
  nonce?: number;
  from: string;
  to: string;
  chainId: number;
  retryCount: number;
  maxRetries: number;
  lastError?: string;
}

export interface GasDetails {
  estimated: number;
  actual?: number;
  price: string;
  currency: string;
  sponsor?: string; // Gas sponsor address
  sponsored: boolean;
}

export interface TransactionMetadata {
  priority: 'low' | 'medium' | 'high' | 'urgent';
  tags: string[];
  description: string;
  source: 'ai_recommendation' | 'user_request' | 'rebalancing' | 'emergency';
  batchId?: string; // For batched transactions
  relatedTransactions: string[];
}

const TokenDetailsSchema = new Schema({
  address: { type: String, required: true },
  symbol: { type: String, required: true },
  amount: { type: String, required: true },
  price: { type: Number, required: true }
}, { _id: false });

const TransactionDetailsSchema = new Schema({
  fromToken: TokenDetailsSchema,
  toToken: TokenDetailsSchema,
  amount: { type: String, required: true },
  value: { type: Number, required: true },
  slippageTolerance: Number,
  deadline: Number,
  reason: { type: String, required: true },
  recommendationId: String
}, { _id: false });

const ExecutionDetailsSchema = new Schema({
  hash: String,
  blockNumber: Number,
  gasUsed: Number,
  gasPrice: String,
  nonce: Number,
  from: { type: String, required: true },
  to: { type: String, required: true },
  chainId: { type: Number, required: true },
  retryCount: { type: Number, default: 0 },
  maxRetries: { type: Number, default: 3 },
  lastError: String
}, { _id: false });

const GasDetailsSchema = new Schema({
  estimated: { type: Number, required: true },
  actual: Number,
  price: { type: String, required: true },
  currency: { type: String, default: 'ETH' },
  sponsor: String,
  sponsored: { type: Boolean, default: false }
}, { _id: false });

const TransactionMetadataSchema = new Schema({
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  tags: [String],
  description: { type: String, required: true },
  source: {
    type: String,
    enum: ['ai_recommendation', 'user_request', 'rebalancing', 'emergency'],
    required: true
  },
  batchId: String,
  relatedTransactions: [String]
}, { _id: false });

const TransactionSchema = new Schema<ITransaction>({
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
    enum: ['buy', 'sell', 'swap', 'stake', 'unstake', 'claim', 'rebalance', 'deposit', 'withdrawal', 'emergency_stop'],
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'cancelled'],
    default: 'pending',
    index: true
  },
  details: {
    type: TransactionDetailsSchema,
    required: true
  },
  execution: {
    type: ExecutionDetailsSchema,
    required: true
  },
  gas: {
    type: GasDetailsSchema,
    required: true
  },
  metadata: {
    type: TransactionMetadataSchema,
    required: true
  },
  completedAt: Date
}, {
  timestamps: true,
  collection: 'transactions'
});

// Indexes
TransactionSchema.index({ userId: 1 });
TransactionSchema.index({ portfolioId: 1 });
TransactionSchema.index({ type: 1 });
TransactionSchema.index({ status: 1 });
TransactionSchema.index({ createdAt: -1 });
TransactionSchema.index({ completedAt: -1 });
TransactionSchema.index({ 'execution.hash': 1 });

// Compound indexes
TransactionSchema.index({ userId: 1, status: 1 });
TransactionSchema.index({ portfolioId: 1, type: 1 });
TransactionSchema.index({ status: 1, createdAt: -1 });
TransactionSchema.index({ 'metadata.batchId': 1 });

// Virtual for isPending
TransactionSchema.virtual('isPending').get(function() {
  return this.status === TransactionStatus.PENDING;
});

// Virtual for isCompleted
TransactionSchema.virtual('isCompleted').get(function() {
  return this.status === TransactionStatus.COMPLETED;
});

// Virtual for isFailed
TransactionSchema.virtual('isFailed').get(function() {
  return this.status === TransactionStatus.FAILED;
});

// Virtual for canRetry
TransactionSchema.virtual('canRetry').get(function() {
  return this.status === TransactionStatus.FAILED && this.execution.retryCount < this.execution.maxRetries;
});

// Virtual for duration
TransactionSchema.virtual('duration').get(function() {
  if (this.completedAt) {
    return this.completedAt.getTime() - this.createdAt.getTime();
  }
  return Date.now() - this.createdAt.getTime();
});

// Methods
TransactionSchema.methods.markCompleted = function(hash: string, blockNumber: number, gasUsed: number) {
  this.status = TransactionStatus.COMPLETED;
  this.completedAt = new Date();
  this.execution.hash = hash;
  this.execution.blockNumber = blockNumber;
  this.execution.gasUsed = gasUsed;
  this.gas.actual = gasUsed;
  return this.save();
};

TransactionSchema.methods.markFailed = function(error: string) {
  this.status = TransactionStatus.FAILED;
  this.execution.lastError = error;
  this.execution.retryCount += 1;
  return this.save();
};

TransactionSchema.methods.retry = function() {
  if (this.canRetry) {
    this.status = TransactionStatus.PENDING;
    this.execution.lastError = undefined;
    return this.save();
  }
  throw new Error('Transaction cannot be retried');
};

TransactionSchema.methods.cancel = function() {
  this.status = TransactionStatus.CANCELLED;
  return this.save();
};

TransactionSchema.methods.addToBatch = function(batchId: string) {
  this.metadata.batchId = batchId;
  return this.save();
};

// Static methods
TransactionSchema.statics.findByUserId = function(userId: string, status?: TransactionStatus) {
  const query: any = { userId };
  if (status) query.status = status;
  return this.find(query).sort({ createdAt: -1 });
};

TransactionSchema.statics.findByPortfolioId = function(portfolioId: string, status?: TransactionStatus) {
  const query: any = { portfolioId };
  if (status) query.status = status;
  return this.find(query).sort({ createdAt: -1 });
};

TransactionSchema.statics.findPendingTransactions = function() {
  return this.find({ status: TransactionStatus.PENDING }).sort({ 'metadata.priority': 1, createdAt: 1 });
};

TransactionSchema.statics.findFailedTransactions = function() {
  return this.find({ status: TransactionStatus.FAILED }).sort({ createdAt: -1 });
};

TransactionSchema.statics.findRetryableTransactions = function() {
  return this.find({
    status: TransactionStatus.FAILED,
    'execution.retryCount': { $lt: 3 }
  }).sort({ createdAt: 1 });
};

TransactionSchema.statics.findByBatchId = function(batchId: string) {
  return this.find({ 'metadata.batchId': batchId }).sort({ createdAt: 1 });
};

TransactionSchema.statics.findByHash = function(hash: string) {
  return this.findOne({ 'execution.hash': hash });
};

TransactionSchema.statics.getTransactionStats = function(userId?: string) {
  const matchStage: any = {};
  if (userId) matchStage.userId = userId;
  
  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalValue: { $sum: '$details.value' }
      }
    }
  ]);
};

// Pre-save middleware
TransactionSchema.pre('save', function(next) {
  // Validate execution details
  if (this.execution.retryCount > this.execution.maxRetries) {
    return next(new Error('Retry count exceeds maximum retries'));
  }
  
  // Auto-update status based on execution details
  if (this.execution.hash && this.status === TransactionStatus.PENDING) {
    this.status = TransactionStatus.COMPLETED;
    this.completedAt = new Date();
  }
  
  next();
});

export const Transaction = mongoose.model<ITransaction>('Transaction', TransactionSchema);
