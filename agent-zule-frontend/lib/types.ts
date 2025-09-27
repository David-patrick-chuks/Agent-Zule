// Core types for Agent Zule Frontend

export interface Portfolio {
  id: string;
  totalValue: number;
  totalValueChange: number;
  totalValueChangePercent: number;
  positions: Position[];
  lastUpdated: string;
}

export interface Position {
  id: string;
  token: Token;
  amount: number;
  value: number;
  valueChange: number;
  valueChangePercent: number;
  allocation: number;
}

export interface Token {
  id: string;
  symbol: string;
  name: string;
  address: string;
  decimals: number;
  logoUrl?: string;
  price: number;
  priceChange24h: number;
  priceChangePercent24h: number;
}

export interface AIRecommendation {
  id: string;
  type: 'rebalance' | 'yield_optimization' | 'dca' | 'risk_management';
  title: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  confidence: number; // 0-100
  estimatedReturn: number;
  riskLevel: 'low' | 'medium' | 'high';
  actions: RecommendationAction[];
  communityVotes: CommunityVote[];
  status: 'pending' | 'approved' | 'rejected' | 'executed';
  createdAt: string;
  expiresAt: string;
}

export interface RecommendationAction {
  id: string;
  type: 'swap' | 'add_liquidity' | 'remove_liquidity' | 'stake' | 'unstake';
  fromToken: Token;
  toToken: Token;
  amount: number;
  estimatedGas: number;
  slippage: number;
}

export interface CommunityVote {
  id: string;
  userId: string;
  username: string;
  avatarUrl?: string;
  vote: 'approve' | 'reject';
  reason?: string;
  createdAt: string;
}

export interface Delegation {
  id: string;
  delegateAddress: string;
  permissions: Permission[];
  isActive: boolean;
  riskThreshold: number;
  maxTransactionValue: number;
  autoRevokeOnHighVolatility: boolean;
  createdAt: string;
  expiresAt?: string;
}

export interface Permission {
  id: string;
  type: 'swap' | 'add_liquidity' | 'remove_liquidity' | 'stake' | 'unstake' | 'transfer';
  isGranted: boolean;
  conditions: PermissionCondition[];
}

export interface PermissionCondition {
  id: string;
  type: 'max_amount' | 'max_slippage' | 'time_limit' | 'volatility_threshold';
  value: number;
  operator: 'lt' | 'lte' | 'eq' | 'gte' | 'gt';
}

export interface MarketCondition {
  volatility: number;
  trend: 'bullish' | 'bearish' | 'sideways';
  riskLevel: 'low' | 'medium' | 'high';
  lastUpdated: string;
}

export interface FrameState {
  currentFrame: 'onboarding' | 'recommendations' | 'voting' | 'status';
  userAddress?: string;
  isConnected: boolean;
  portfolio?: Portfolio;
  recommendations: AIRecommendation[];
  delegations: Delegation[];
  marketCondition: MarketCondition;
}

export interface Web3State {
  isConnected: boolean;
  account?: string;
  chainId?: number;
  balance?: string;
  isConnecting: boolean;
  error?: string;
}

// API Response types
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// GraphQL types for Envio integration
export interface GraphQLPortfolioData {
  portfolio: Portfolio;
  marketData: {
    tokens: Token[];
    prices: {
      [tokenId: string]: number;
    };
  };
}

export interface GraphQLRecommendationData {
  recommendations: AIRecommendation[];
  marketConditions: MarketCondition;
}

// Frame-specific types
export interface FrameButton {
  text: string;
  action: 'post' | 'post_redirect' | 'mint' | 'link';
  target?: string;
}

export interface FrameImage {
  src: string;
  aspectRatio: '1.91:1' | '1:1';
}

export interface FrameMetadata {
  title: string;
  description: string;
  image: FrameImage;
  buttons: FrameButton[];
  postUrl?: string;
}
