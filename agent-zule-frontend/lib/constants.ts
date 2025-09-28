// Constants for Agent Zule Frontend
// This file is kept for backward compatibility
// New code should use the config.ts file instead

import { config } from './config';

export const APP_CONFIG = config.app;
export const BACKEND_CONFIG = config.backend;

export const FRAME_CONFIG = config.frame;
export const MONAD_CONFIG = config.monad;
export const METAMASK_CONFIG = config.metamask;
export const ENVIO_CONFIG = config.envio;

export const API_ENDPOINTS = {
  // Backend API endpoints (matching backend structure)
  portfolios: '/api/v1/portfolios',
  recommendations: '/api/v1/recommendations',
  permissions: '/api/v1/permissions',
  executions: '/api/v1/executions',
  health: '/api/v1/health',
  // AI endpoints
  aiAnalyze: '/api/v1/ai/analyze',
  aiOptimizeYield: '/api/v1/ai/optimize-yield',
  aiDcaStrategy: '/api/v1/ai/dca-strategy',
  aiRiskAssessment: '/api/v1/ai/risk-assessment',
  // WebSocket endpoints
  wsPortfolio: '/api/v1/ws/portfolio',
  wsRecommendations: '/api/v1/ws/recommendations',
  // Frame endpoints
  frame: '/api/frame',
} as const;

export const RISK_LEVELS = config.risk.levels;
export const RECOMMENDATION_TYPES = config.recommendations.types;
export const PERMISSION_TYPES = config.permissions.types;

export const FRAME_BUTTONS = {
  join: {
    text: 'Join Agent Zule',
    action: 'post' as const,
  },
  connect: {
    text: 'Connect Wallet',
    action: 'post' as const,
  },
  approve: {
    text: 'Approve',
    action: 'post' as const,
  },
  reject: {
    text: 'Reject',
    action: 'post' as const,
  },
  viewDashboard: {
    text: 'View Dashboard',
    action: 'link' as const,
  },
  execute: {
    text: 'Execute Trade',
    action: 'post' as const,
  },
} as const;

export const ANIMATION_DURATIONS = config.ui.animationDurations;
export const POLLING_INTERVALS = config.ui.pollingIntervals;
export const ERROR_MESSAGES = config.errors;
export const SUCCESS_MESSAGES = config.success;
