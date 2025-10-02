/**
 * Common types and interfaces for Agent Zule Backend
 * These types are shared across all modules
 */

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
}

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface ServiceResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

export enum RiskLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum RecommendationType {
  REBALANCE = 'rebalance',
  YIELD_OPTIMIZATION = 'yield_optimization',
  DCA_STRATEGY = 'dca_strategy',
  RISK_REDUCTION = 'risk_reduction',
  POSITION_ADJUSTMENT = 'position_adjustment'
}

export enum PermissionStatus {
  ACTIVE = 'active',
  REVOKED = 'revoked',
  PENDING = 'pending',
  EXPIRED = 'expired'
}

export enum TransactionStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export interface MarketCondition {
  volatility: number;
  trend: 'bullish' | 'bearish' | 'sideways';
  volume: number;
  liquidity: number;
  sentiment?: number;
  timestamp: Date;
}

export interface TokenInfo {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  price: number;
  marketCap?: number;
  volume24h?: number;
}

export interface Position {
  token: TokenInfo;
  amount: string;
  value: number;
  allocation: number; // Percentage of total portfolio
  entryPrice?: number;
  currentPrice: number;
  pnl?: number;
  pnlPercentage?: number;
}

export interface PortfolioMetrics {
  totalValue: number;
  totalPnl: number;
  totalPnlPercentage: number;
  riskScore: number;
  sharpeRatio?: number;
  maxDrawdown?: number;
  volatility?: number;
  lastUpdated: Date;
}

export interface NotificationSettings {
  email: boolean;
  push: boolean;
  sms: boolean;
  telegram?: boolean;
  discord?: boolean;
}

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  details: Record<string, any>;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
}
