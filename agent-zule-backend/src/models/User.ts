import mongoose, { Document, Schema } from 'mongoose';
import { NotificationSettings } from '../types/Common';

export interface IUser extends Document {
  walletAddress: string;
  username?: string;
  email?: string;
  preferences: {
    riskTolerance: 'low' | 'medium' | 'high';
    investmentGoals: string[];
    notificationSettings: NotificationSettings;
    theme: 'light' | 'dark';
    language: string;
    timezone: string;
  };
  permissions: {
    autoRevokeThreshold: number;
    communityVotingEnabled: boolean;
    maxPositionSize: number;
    emergencyStopEnabled: boolean;
  };
  metadata: {
    farcasterFid?: string;
    farcasterUsername?: string;
    joinDate: Date;
    lastActive: Date;
    isActive: boolean;
    kycStatus: 'pending' | 'verified' | 'rejected';
  };
  statistics: {
    totalPortfolios: number;
    totalInvested: number;
    totalReturns: number;
    successfulRecommendations: number;
    communityVotes: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>({
  walletAddress: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  username: {
    type: String,
    sparse: true,
    trim: true
  },
  email: {
    type: String,
    sparse: true,
    lowercase: true,
    trim: true
  },
  preferences: {
    riskTolerance: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium'
    },
    investmentGoals: [{
      type: String,
      trim: true
    }],
    notificationSettings: {
      email: {
        type: Boolean,
        default: true
      },
      push: {
        type: Boolean,
        default: true
      },
      sms: {
        type: Boolean,
        default: false
      },
      telegram: {
        type: Boolean,
        default: false
      },
      discord: {
        type: Boolean,
        default: false
      }
    },
    theme: {
      type: String,
      enum: ['light', 'dark'],
      default: 'dark'
    },
    language: {
      type: String,
      default: 'en'
    },
    timezone: {
      type: String,
      default: 'UTC'
    }
  },
  permissions: {
    autoRevokeThreshold: {
      type: Number,
      default: 0.15,
      min: 0,
      max: 1
    },
    communityVotingEnabled: {
      type: Boolean,
      default: true
    },
    maxPositionSize: {
      type: Number,
      default: 0.1,
      min: 0,
      max: 1
    },
    emergencyStopEnabled: {
      type: Boolean,
      default: true
    }
  },
  metadata: {
    farcasterFid: {
      type: String,
      sparse: true
    },
    farcasterUsername: {
      type: String,
      sparse: true,
      trim: true
    },
    joinDate: {
      type: Date,
      default: Date.now
    },
    lastActive: {
      type: Date,
      default: Date.now
    },
    isActive: {
      type: Boolean,
      default: true
    },
    kycStatus: {
      type: String,
      enum: ['pending', 'verified', 'rejected'],
      default: 'pending'
    }
  },
  statistics: {
    totalPortfolios: {
      type: Number,
      default: 0
    },
    totalInvested: {
      type: Number,
      default: 0
    },
    totalReturns: {
      type: Number,
      default: 0
    },
    successfulRecommendations: {
      type: Number,
      default: 0
    },
    communityVotes: {
      type: Number,
      default: 0
    }
  }
}, {
  timestamps: true,
  collection: 'users'
});

// Indexes for better query performance
UserSchema.index({ walletAddress: 1 });
UserSchema.index({ 'metadata.farcasterFid': 1 });
UserSchema.index({ 'metadata.farcasterUsername': 1 });
UserSchema.index({ createdAt: -1 });
UserSchema.index({ 'metadata.lastActive': -1 });

// Virtual for user's total portfolio value
UserSchema.virtual('totalPortfolioValue').get(function() {
  return this.statistics.totalInvested + this.statistics.totalReturns;
});

// Methods
UserSchema.methods.updateLastActive = function() {
  this.metadata.lastActive = new Date();
  return this.save();
};

UserSchema.methods.incrementStatistic = function(stat: string, value: number = 1) {
  this.statistics[stat] += value;
  return this.save();
};

// Static methods
UserSchema.statics.findByWalletAddress = function(walletAddress: string) {
  return this.findOne({ walletAddress: walletAddress.toLowerCase() });
};

UserSchema.statics.findByFarcasterFid = function(fid: string) {
  return this.findOne({ 'metadata.farcasterFid': fid });
};

UserSchema.statics.findActiveUsers = function() {
  return this.find({ 'metadata.isActive': true });
};

// Pre-save middleware
UserSchema.pre('save', function(next) {
  if (this.isModified('walletAddress')) {
    this.walletAddress = this.walletAddress.toLowerCase();
  }
  next();
});

export const User = mongoose.model<IUser>('User', UserSchema);
