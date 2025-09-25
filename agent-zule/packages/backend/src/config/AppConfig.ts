import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export interface AppConfig {
  server: {
    port: number;
    host: string;
    apiVersion: string;
    cors: {
      origin: string[];
      credentials: boolean;
    };
  };
  database: {
    uri: string;
    testUri: string;
  };
  jwt: {
    secret: string;
    expiresIn: string;
  };
  envio: {
    apiKey: string;
    graphqlUrl: string;
    indexerUrl: string;
  };
  blockchain: {
    monad: {
      rpcUrl: string;
      chainId: number;
      explorerUrl: string;
    };
    ethereum: {
      rpcUrl: string;
      chainId: number;
    };
    metamask: {
      smartAccountFactory: string;
      entryPoint: string;
    };
  };
  ai: {
    modelPath: string;
    confidenceThreshold: number;
    maxRecommendations: number;
  };
  risk: {
    maxPositionSize: number;
    volatilityThreshold: number;
    autoRevokeThreshold: number;
  };
  community: {
    votingEnabled: boolean;
    minVotes: number;
    voteTimeoutHours: number;
  };
  logging: {
    level: string;
    file: string;
  };
  rateLimiting: {
    windowMs: number;
    maxRequests: number;
  };
}

class ConfigManager {
  private static instance: ConfigManager;
  private config: AppConfig;

  private constructor() {
    this.config = this.loadConfig();
    this.validateConfig();
  }

  public static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  public getConfig(): AppConfig {
    return this.config;
  }

  private loadConfig(): AppConfig {
    return {
      server: {
        port: parseInt(process.env.PORT || '3001', 10),
        host: process.env.HOST || 'localhost',
        apiVersion: process.env.API_VERSION || 'v1',
        cors: {
          origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
          credentials: process.env.CORS_CREDENTIALS === 'true'
        }
      },
      database: {
        uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/agent-zule',
        testUri: process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/agent-zule-test'
      },
      jwt: {
        secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-here',
        expiresIn: process.env.JWT_EXPIRES_IN || '7d'
      },
      envio: {
        apiKey: process.env.ENVIO_API_KEY || '',
        graphqlUrl: process.env.ENVIO_GRAPHQL_URL || 'https://api.envio.dev/graphql',
        indexerUrl: process.env.ENVIO_INDEXER_URL || 'https://indexer.envio.dev'
      },
      blockchain: {
        monad: {
          rpcUrl: process.env.MONAD_RPC_URL || 'https://testnet.monad.xyz',
          chainId: parseInt(process.env.MONAD_CHAIN_ID || '123456789', 10),
          explorerUrl: process.env.MONAD_EXPLORER_URL || 'https://testnet.monadexplorer.com'
        },
        ethereum: {
          rpcUrl: process.env.ETHEREUM_RPC_URL || '',
          chainId: parseInt(process.env.ETHEREUM_CHAIN_ID || '1', 10)
        },
        metamask: {
          smartAccountFactory: process.env.METAMASK_SMART_ACCOUNT_FACTORY || '0x9406Cc6185a346906296840746125a0E44976454',
          entryPoint: process.env.METAMASK_ENTRYPOINT || '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789'
        }
      },
      ai: {
        modelPath: process.env.AI_MODEL_PATH || './models/portfolio-ai',
        confidenceThreshold: parseFloat(process.env.AI_CONFIDENCE_THRESHOLD || '0.8'),
        maxRecommendations: parseInt(process.env.AI_MAX_RECOMMENDATIONS || '10', 10)
      },
      risk: {
        maxPositionSize: parseFloat(process.env.MAX_POSITION_SIZE || '0.1'),
        volatilityThreshold: parseFloat(process.env.VOLATILITY_THRESHOLD || '0.05'),
        autoRevokeThreshold: parseFloat(process.env.AUTO_REVOKE_THRESHOLD || '0.15')
      },
      community: {
        votingEnabled: process.env.COMMUNITY_VOTING_ENABLED === 'true',
        minVotes: parseInt(process.env.MIN_COMMUNITY_VOTES || '3', 10),
        voteTimeoutHours: parseInt(process.env.VOTE_TIMEOUT_HOURS || '24', 10)
      },
      logging: {
        level: process.env.LOG_LEVEL || 'info',
        file: process.env.LOG_FILE || './logs/agent-zule.log'
      },
      rateLimiting: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
        maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10)
      }
    };
  }

  private validateConfig(): void {
    const requiredEnvVars = [
      'MONGODB_URI',
      'JWT_SECRET'
    ];

    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
    }

    // Validate numeric values
    if (this.config.server.port < 1 || this.config.server.port > 65535) {
      throw new Error('Invalid port number');
    }

    if (this.config.ai.confidenceThreshold < 0 || this.config.ai.confidenceThreshold > 1) {
      throw new Error('AI confidence threshold must be between 0 and 1');
    }

    if (this.config.risk.maxPositionSize < 0 || this.config.risk.maxPositionSize > 1) {
      throw new Error('Max position size must be between 0 and 1');
    }
  }

  public isDevelopment(): boolean {
    return process.env.NODE_ENV === 'development';
  }

  public isProduction(): boolean {
    return process.env.NODE_ENV === 'production';
  }

  public isTest(): boolean {
    return process.env.NODE_ENV === 'test';
  }
}

export const Config = ConfigManager.getInstance();
export default Config.getConfig();
