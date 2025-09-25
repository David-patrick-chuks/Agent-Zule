// Constants for Agent Zule Frontend

export const APP_CONFIG = {
  name: 'Agent Zule',
  description: 'AI-Powered Portfolio Rebalancing Agent on Monad',
  version: '1.0.0',
  url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
} as const;

export const FRAME_CONFIG = {
  baseUrl: process.env.NEXT_PUBLIC_FRAME_URL || 'http://localhost:3000',
  imageAspectRatio: '1.91:1' as const,
  maxButtons: 4,
} as const;

export const MONAD_CONFIG = {
  chainId: 0x1a4, // Monad testnet chain ID
  chainName: 'Monad Testnet',
  rpcUrl: process.env.NEXT_PUBLIC_MONAD_RPC_URL || 'https://testnet-rpc.monad.xyz',
  explorerUrl: 'https://testnet.monadexplorer.com',
  nativeCurrency: {
    name: 'Monad',
    symbol: 'MON',
    decimals: 18,
  },
} as const;

export const METAMASK_CONFIG = {
  dappMetadata: {
    name: APP_CONFIG.name,
    url: APP_CONFIG.url,
    iconUrl: `${APP_CONFIG.url}/icon-512.png`,
  },
  infuraAPIKey: process.env.NEXT_PUBLIC_INFURA_API_KEY,
} as const;

export const ENVIO_CONFIG = {
  graphqlEndpoint: process.env.NEXT_PUBLIC_ENVIO_GRAPHQL_URL || 'http://localhost:4000/graphql',
  subscriptionEndpoint: process.env.NEXT_PUBLIC_ENVIO_WS_URL || 'ws://localhost:4000/graphql',
} as const;

export const API_ENDPOINTS = {
  portfolio: '/api/portfolio',
  recommendations: '/api/recommendations',
  delegations: '/api/delegations',
  execute: '/api/execute',
  webhook: '/api/webhook',
  frame: '/api/frame',
} as const;

export const RISK_LEVELS = {
  low: {
    label: 'Low Risk',
    color: 'green',
    maxVolatility: 0.1,
    maxSlippage: 0.5,
  },
  medium: {
    label: 'Medium Risk',
    color: 'yellow',
    maxVolatility: 0.25,
    maxSlippage: 1.0,
  },
  high: {
    label: 'High Risk',
    color: 'red',
    maxVolatility: 0.5,
    maxSlippage: 2.0,
  },
} as const;

export const RECOMMENDATION_TYPES = {
  rebalance: {
    label: 'Portfolio Rebalancing',
    icon: '⚖️',
    description: 'Optimize portfolio allocation',
  },
  yield_optimization: {
    label: 'Yield Optimization',
    icon: '📈',
    description: 'Maximize yield opportunities',
  },
  dca: {
    label: 'Dollar Cost Averaging',
    icon: '💰',
    description: 'Systematic investment strategy',
  },
  risk_management: {
    label: 'Risk Management',
    icon: '🛡️',
    description: 'Protect against market volatility',
  },
} as const;

export const PERMISSION_TYPES = {
  swap: {
    label: 'Token Swaps',
    description: 'Execute token swaps',
    icon: '🔄',
  },
  add_liquidity: {
    label: 'Add Liquidity',
    description: 'Add liquidity to pools',
    icon: '💧',
  },
  remove_liquidity: {
    label: 'Remove Liquidity',
    description: 'Remove liquidity from pools',
    icon: '🚰',
  },
  stake: {
    label: 'Staking',
    description: 'Stake tokens for rewards',
    icon: '🏦',
  },
  unstake: {
    label: 'Unstaking',
    description: 'Unstake tokens',
    icon: '🏧',
  },
  transfer: {
    label: 'Transfers',
    description: 'Transfer tokens',
    icon: '📤',
  },
} as const;

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

export const ANIMATION_DURATIONS = {
  fast: 150,
  normal: 300,
  slow: 500,
} as const;

export const POLLING_INTERVALS = {
  portfolio: 30000, // 30 seconds
  recommendations: 60000, // 1 minute
  marketData: 10000, // 10 seconds
  delegations: 60000, // 1 minute
} as const;

export const ERROR_MESSAGES = {
  walletNotConnected: 'Please connect your wallet to continue',
  insufficientBalance: 'Insufficient balance for this transaction',
  transactionFailed: 'Transaction failed. Please try again.',
  networkError: 'Network error. Please check your connection.',
  unauthorized: 'You are not authorized to perform this action',
  delegationExpired: 'Delegation has expired. Please renew.',
  highVolatility: 'High volatility detected. Delegation auto-revoked.',
} as const;

export const SUCCESS_MESSAGES = {
  walletConnected: 'Wallet connected successfully',
  delegationGranted: 'Delegation granted successfully',
  delegationRevoked: 'Delegation revoked successfully',
  tradeExecuted: 'Trade executed successfully',
  recommendationApproved: 'Recommendation approved',
  recommendationRejected: 'Recommendation rejected',
} as const;
