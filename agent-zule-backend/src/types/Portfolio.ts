import { Position, PortfolioMetrics, TokenInfo } from './Common';

export { Position, PortfolioMetrics, TokenInfo };

export interface Portfolio {
  id: string;
  userId: string;
  name: string;
  positions: Position[];
  metrics: PortfolioMetrics;
  strategy: PortfolioStrategy;
  riskProfile: RiskProfile;
  createdAt: Date;
  updatedAt: Date;
  lastRebalanced?: Date;
  isActive: boolean;
}

export interface PortfolioStrategy {
  type: 'conservative' | 'moderate' | 'aggressive' | 'custom';
  rebalancingFrequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  maxPositionSize: number;
  minPositionSize: number;
  allowedTokens: string[]; // Token addresses
  blacklistedTokens: string[];
  yieldOptimizationEnabled: boolean;
  dcaEnabled: boolean;
  stopLossEnabled: boolean;
  stopLossPercentage?: number;
}

export interface RiskProfile {
  tolerance: 'low' | 'medium' | 'high';
  maxDrawdown: number;
  volatilityThreshold: number;
  correlationLimit: number;
  diversificationTarget: number;
  hedgingEnabled: boolean;
}

export interface PortfolioAnalysis {
  portfolioId: string;
  analysis: {
    overallScore: number;
    riskAssessment: RiskAssessment;
    performanceMetrics: PerformanceMetrics;
    diversificationAnalysis: DiversificationAnalysis;
    yieldAnalysis: YieldAnalysis;
    rebalancingRecommendations: RebalancingRecommendation[];
  };
  timestamp: Date;
  confidence: number;
}

export interface RiskAssessment {
  score: number; // 0-100
  level: 'low' | 'medium' | 'high' | 'critical';
  factors: RiskFactor[];
  recommendations: string[];
}

export interface RiskFactor {
  name: string;
  impact: 'low' | 'medium' | 'high';
  description: string;
  mitigation?: string;
}

export interface PerformanceMetrics {
  totalReturn: number;
  annualizedReturn: number;
  sharpeRatio: number;
  maxDrawdown: number;
  volatility: number;
  beta: number;
  alpha: number;
  sortinoRatio?: number;
  calmarRatio?: number;
}

export interface DiversificationAnalysis {
  score: number;
  concentrationRisk: number;
  sectorDistribution: Record<string, number>;
  tokenDistribution: Record<string, number>;
  correlationMatrix: Record<string, Record<string, number>>;
  recommendations: string[];
}

export interface YieldAnalysis {
  currentYield: number;
  potentialYield: number;
  yieldSources: YieldSource[];
  optimizationOpportunities: YieldOpportunity[];
}

export interface YieldSource {
  token: string;
  source: 'staking' | 'liquidity_pool' | 'lending' | 'farming';
  apy: number;
  risk: 'low' | 'medium' | 'high';
}

export interface YieldOpportunity {
  from: TokenInfo;
  to: TokenInfo;
  potentialApy: number;
  riskLevel: 'low' | 'medium' | 'high';
  migrationCost: number;
  description: string;
}

export interface RebalancingRecommendation {
  id: string;
  type: 'buy' | 'sell' | 'swap';
  token: TokenInfo;
  amount: string;
  percentage?: number;
  reason: string;
  priority: 'low' | 'medium' | 'high';
  expectedImpact: number;
  riskLevel: 'low' | 'medium' | 'high';
}

export interface PortfolioHistory {
  portfolioId: string;
  snapshot: {
    positions: Position[];
    metrics: PortfolioMetrics;
    timestamp: Date;
  };
  changes: PortfolioChange[];
}

export interface PortfolioChange {
  type: 'buy' | 'sell' | 'swap' | 'rebalance';
  token: string;
  amount: string;
  value: number;
  price: number;
  timestamp: Date;
  reason?: string;
}

export interface PortfolioComparison {
  portfolioId: string;
  benchmark: string; // e.g., 'BTC', 'ETH', 'custom'
  metrics: {
    portfolioReturn: number;
    benchmarkReturn: number;
    alpha: number;
    beta: number;
    trackingError: number;
    informationRatio: number;
  };
  period: {
    start: Date;
    end: Date;
  };
}
