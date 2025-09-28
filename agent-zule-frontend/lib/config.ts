// Configuration file for Agent Zule Frontend
// This file centralizes all configuration and environment variables

export const config = {
  // App Configuration
  app: {
    name: 'Agent Zule',
    description: 'AI-Powered Portfolio Management Platform',
    version: '1.0.0',
    url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  },

  // Backend Configuration
  backend: {
    baseUrl: process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000',
    timeout: 30000, // 30 seconds
    retryAttempts: 3,
    apiVersion: 'v1',
  },

  // Monad Network Configuration
  monad: {
    chainId: parseInt(process.env.NEXT_PUBLIC_MONAD_CHAIN_ID || '420'),
    chainName: 'Monad Testnet',
    rpcUrl: process.env.NEXT_PUBLIC_MONAD_RPC_URL || 'https://testnet-rpc.monad.xyz',
    explorerUrl: 'https://testnet.monadexplorer.com',
    nativeCurrency: {
      name: 'Monad',
      symbol: 'MON',
      decimals: 18,
    },
  },

  // Smart Contract Addresses
  contracts: {
    PortfolioAgent: process.env.NEXT_PUBLIC_PORTFOLIO_AGENT_ADDRESS || '',
    PermissionManager: process.env.NEXT_PUBLIC_PERMISSION_MANAGER_ADDRESS || '',
    VotingEngine: process.env.NEXT_PUBLIC_VOTING_ENGINE_ADDRESS || '',
    ExecutionEngine: process.env.NEXT_PUBLIC_EXECUTION_ENGINE_ADDRESS || '',
  },

  // Envio Configuration
  envio: {
    graphqlEndpoint: process.env.NEXT_PUBLIC_ENVIO_GRAPHQL_URL || 'http://localhost:4000/graphql',
    subscriptionEndpoint: process.env.NEXT_PUBLIC_ENVIO_WS_URL || 'ws://localhost:4000/graphql',
  },

  // MetaMask Configuration
  metamask: {
    dappMetadata: {
      name: 'Agent Zule',
      url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      iconUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/icon-512.png`,
    },
    infuraAPIKey: process.env.NEXT_PUBLIC_INFURA_API_KEY,
  },

  // Farcaster Frame Configuration
  frame: {
    baseUrl: process.env.NEXT_PUBLIC_FRAME_URL || 'http://localhost:3000',
    imageAspectRatio: '1.91:1' as const,
    maxButtons: 4,
  },

  // Risk Management
  risk: {
    levels: {
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
    },
  },

  // Recommendation Types
  recommendations: {
    types: {
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
    },
  },

  // Permission Types
  permissions: {
    types: {
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
    },
  },

  // Animation and UI
  ui: {
    animationDurations: {
      fast: 150,
      normal: 300,
      slow: 500,
    },
    pollingIntervals: {
      portfolio: 30000, // 30 seconds
      recommendations: 60000, // 1 minute
      marketData: 10000, // 10 seconds
      permissions: 60000, // 1 minute
    },
  },

  // Error Messages
  errors: {
    walletNotConnected: 'Please connect your wallet to continue',
    insufficientBalance: 'Insufficient balance for this transaction',
    transactionFailed: 'Transaction failed. Please try again.',
    networkError: 'Network error. Please check your connection.',
    unauthorized: 'You are not authorized to perform this action',
    delegationExpired: 'Delegation has expired. Please renew.',
    highVolatility: 'High volatility detected. Delegation auto-revoked.',
  },

  // Success Messages
  success: {
    walletConnected: 'Wallet connected successfully',
    delegationGranted: 'Delegation granted successfully',
    delegationRevoked: 'Delegation revoked successfully',
    tradeExecuted: 'Trade executed successfully',
    recommendationApproved: 'Recommendation approved',
    recommendationRejected: 'Recommendation rejected',
  },

  // Development flags
  development: {
    enableLogging: process.env.NODE_ENV === 'development',
    enableMockData: process.env.NEXT_PUBLIC_ENABLE_MOCK_DATA === 'true',
    enableContractIntegration: process.env.NEXT_PUBLIC_ENABLE_CONTRACTS !== 'false',
    enableWebSocket: process.env.NEXT_PUBLIC_ENABLE_WEBSOCKET !== 'false',
  },
} as const;

// Type exports for better TypeScript support
export type Config = typeof config;
export type RiskLevel = keyof typeof config.risk.levels;
export type RecommendationType = keyof typeof config.recommendations.types;
export type PermissionType = keyof typeof config.permissions.types;

// Utility functions
export const isDevelopment = () => config.development.enableLogging;
export const isProduction = () => !isDevelopment();
export const getContractAddress = (contractName: keyof typeof config.contracts) => 
  config.contracts[contractName];
export const getRiskConfig = (level: RiskLevel) => config.risk.levels[level];
export const getRecommendationConfig = (type: RecommendationType) => 
  config.recommendations.types[type];
export const getPermissionConfig = (type: PermissionType) => 
  config.permissions.types[type];
