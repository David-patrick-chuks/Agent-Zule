import { RecommendationType, RiskLevel } from './Common';
import { TokenInfo } from './Common';

export interface Recommendation {
  id: string;
  userId: string;
  portfolioId: string;
  type: RecommendationType;
  title: string;
  description: string;
  details: RecommendationDetails;
  riskLevel: RiskLevel;
  confidence: number; // 0-1
  expectedImpact: number; // Expected return/improvement
  status: RecommendationStatus;
  communityVotes?: CommunityVote[];
  aiReasoning: AIReasoning;
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
  executedAt?: Date;
}

export enum RecommendationStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  EXPIRED = 'expired',
  EXECUTED = 'executed',
  CANCELLED = 'cancelled'
}

export interface RecommendationDetails {
  actions: RecommendedAction[];
  estimatedGasCost?: number;
  estimatedSlippage?: number;
  timeHorizon: 'short' | 'medium' | 'long';
  marketConditions: MarketCondition;
}

export interface RecommendedAction {
  type: 'buy' | 'sell' | 'swap' | 'stake' | 'unstake' | 'claim';
  token: TokenInfo;
  amount: string;
  percentage?: number;
  targetPrice?: number;
  slippageTolerance?: number;
  priority: number; // 1-10
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
  confidence: number; // 0-1
  timestamp: Date;
}

export interface AIReasoning {
  dataPoints: DataPoint[];
  analysis: string;
  confidence: number;
  riskFactors: RiskFactor[];
  alternatives: AlternativeOption[];
  model: string; // AI model used
  version: string; // Model version
}

export interface DataPoint {
  source: 'envio' | 'market' | 'portfolio' | 'external';
  type: string;
  value: any;
  weight: number; // Importance weight
  timestamp: Date;
}

export interface RiskFactor {
  name: string;
  impact: 'low' | 'medium' | 'high';
  probability: number; // 0-1
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

export interface RecommendationMetrics {
  totalGenerated: number;
  approvalRate: number;
  executionRate: number;
  averageConfidence: number;
  averageImpact: number;
  topPerformingTypes: RecommendationTypePerformance[];
  userSatisfaction: number;
}

export interface RecommendationTypePerformance {
  type: RecommendationType;
  count: number;
  approvalRate: number;
  executionRate: number;
  averageReturn: number;
  successRate: number;
}

export interface RecommendationFilter {
  userId?: string;
  portfolioId?: string;
  type?: RecommendationType;
  status?: RecommendationStatus;
  riskLevel?: RiskLevel;
  minConfidence?: number;
  minImpact?: number;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

export interface RecommendationStats {
  period: {
    start: Date;
    end: Date;
  };
  totalRecommendations: number;
  approvedRecommendations: number;
  executedRecommendations: number;
  averageConfidence: number;
  averageImpact: number;
  topPerformingRecommendations: Recommendation[];
  riskDistribution: Record<RiskLevel, number>;
  typeDistribution: Record<RecommendationType, number>;
}
