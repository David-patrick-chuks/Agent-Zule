import { portfolioService } from './portfolioService';
import { recommendationService } from './recommendationService';
import { permissionService } from './permissionService';
import { websocketService } from './websocketService';
import { contractService } from '../web3/contractService';
import { walletService } from '../web3/walletService';
import { BACKEND_CONFIG } from '@/lib/constants';

export interface ApiClientConfig {
  enableWebSocket?: boolean;
  enableContractIntegration?: boolean;
  autoConnect?: boolean;
}

class ApiClient {
  private config: ApiClientConfig;
  private isInitialized = false;

  // Services
  public portfolio = portfolioService;
  public recommendations = recommendationService;
  public permissions = permissionService;
  public websocket = websocketService;
  public contracts = contractService;
  public wallet = walletService;

  constructor(config: ApiClientConfig = {}) {
    this.config = {
      enableWebSocket: true,
      enableContractIntegration: true,
      autoConnect: true,
      ...config,
    };
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Initialize wallet service
      await this.wallet.getWalletState();

      // Initialize contract service if enabled
      if (this.config.enableContractIntegration) {
        // Contract service will be initialized when wallet is connected
        console.log('Contract integration enabled');
      }

      // Initialize WebSocket service if enabled
      if (this.config.enableWebSocket) {
        this.setupWebSocketCallbacks();
        console.log('WebSocket service enabled');
      }

      // Check backend health
      await this.checkBackendHealth();

      this.isInitialized = true;
      console.log('API Client initialized successfully');
    } catch (error) {
      console.error('Failed to initialize API Client:', error);
      throw error;
    }
  }

  private async checkBackendHealth(): Promise<void> {
    try {
      const response = await fetch(`${BACKEND_CONFIG.baseUrl}/api/v1/health`);
      if (!response.ok) {
        throw new Error(`Backend health check failed: ${response.status}`);
      }
      console.log('Backend health check passed');
    } catch (error) {
      console.warn('Backend health check failed:', error);
      // Don't throw here as the backend might not be running yet
    }
  }

  private setupWebSocketCallbacks(): void {
    this.websocket.setCallbacks({
      onPortfolioUpdate: (data) => {
        console.log('Portfolio updated:', data);
        // Emit custom events or update stores here
        this.emitEvent('portfolioUpdate', data);
      },
      onRecommendationUpdate: (data) => {
        console.log('Recommendation updated:', data);
        this.emitEvent('recommendationUpdate', data);
      },
      onPermissionUpdate: (data) => {
        console.log('Permission updated:', data);
        this.emitEvent('permissionUpdate', data);
      },
      onExecutionUpdate: (data) => {
        console.log('Execution updated:', data);
        this.emitEvent('executionUpdate', data);
      },
      onMarketDataUpdate: (data) => {
        console.log('Market data updated:', data);
        this.emitEvent('marketDataUpdate', data);
      },
      onError: (error) => {
        console.error('WebSocket error:', error);
        this.emitEvent('websocketError', error);
      },
      onConnect: () => {
        console.log('WebSocket connected');
        this.emitEvent('websocketConnect');
      },
      onDisconnect: () => {
        console.log('WebSocket disconnected');
        this.emitEvent('websocketDisconnect');
      },
    });
  }

  // Event system for components to listen to updates
  private eventListeners: Map<string, Function[]> = new Map();

  on(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  off(event: string, callback: Function): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  private emitEvent(event: string, data?: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => callback(data));
    }
  }

  // Convenience methods for common operations
  async connectWallet(): Promise<any> {
    const walletState = await this.wallet.connectWallet();
    
    if (walletState.isConnected && this.config.enableContractIntegration) {
      // Initialize contract service with the connected wallet
      const provider = new (window as any).ethereum;
      const signer = await provider.getSigner();
      await this.contracts.initialize(provider, signer);
    }
    
    return walletState;
  }

  async getPortfolioData(userAddress?: string): Promise<any> {
    try {
      // Get portfolio from API
      const portfolioResponse = await this.portfolio.getPortfolios(userAddress);
      
      // If we have a connected wallet and contract integration is enabled
      if (userAddress && this.config.enableContractIntegration && this.contracts.isInitialized()) {
        try {
          // Get on-chain data as well
          const onChainPositions = await this.contracts.getPortfolioPositions(userAddress);
          const onChainMetrics = await this.contracts.getPortfolioMetrics(userAddress);
          
          // Merge API and on-chain data
          return {
            ...portfolioResponse,
            onChainData: {
              positions: onChainPositions,
              metrics: onChainMetrics,
            },
          };
        } catch (error) {
          console.warn('Failed to fetch on-chain data:', error);
          return portfolioResponse;
        }
      }
      
      return portfolioResponse;
    } catch (error) {
      console.error('Failed to get portfolio data:', error);
      throw error;
    }
  }

  async executeRecommendation(recommendationId: string): Promise<any> {
    try {
      // Approve the recommendation
      await this.recommendations.approveRecommendation(recommendationId);
      
      // If contract integration is enabled, execute on-chain
      if (this.config.enableContractIntegration && this.contracts.isInitialized()) {
        // Get recommendation details to understand what to execute
        const recommendation = await this.recommendations.getRecommendationDetails(recommendationId);
        
        // Execute based on recommendation type
        switch (recommendation.data.type) {
          case 'rebalance':
            return await this.contracts.executeRebalancing(
              recommendation.data.actions,
              recommendation.data.maxSlippage || 500, // 5%
              Date.now() + 300000 // 5 minutes
            );
          case 'yield_optimization':
            return await this.contracts.executeYieldOptimization(
              recommendation.data.opportunity,
              BigInt(recommendation.data.amount)
            );
          case 'dca':
            return await this.contracts.executeDCA(recommendation.data.params);
          default:
            throw new Error(`Unknown recommendation type: ${recommendation.data.type}`);
        }
      }
      
      return { success: true, message: 'Recommendation approved' };
    } catch (error) {
      console.error('Failed to execute recommendation:', error);
      throw error;
    }
  }

  async setupPortfolioMonitoring(portfolioId: string): Promise<void> {
    if (this.config.enableWebSocket) {
      await this.websocket.connectToPortfolioUpdates(portfolioId);
    }
  }

  async setupRecommendationMonitoring(): Promise<void> {
    if (this.config.enableWebSocket) {
      await this.websocket.connectToRecommendationUpdates();
    }
  }

  // Cleanup method
  async cleanup(): Promise<void> {
    this.websocket.disconnectAll();
    this.eventListeners.clear();
    this.isInitialized = false;
  }

  // Health check
  async healthCheck(): Promise<{
    api: boolean;
    websocket: boolean;
    contracts: boolean;
    wallet: boolean;
  }> {
    const health = {
      api: false,
      websocket: false,
      contracts: false,
      wallet: false,
    };

    try {
      // Check API
      const response = await fetch(`${BACKEND_CONFIG.baseUrl}/api/v1/health`);
      health.api = response.ok;
    } catch (error) {
      console.warn('API health check failed:', error);
    }

    // Check WebSocket
    health.websocket = this.websocket.isPortfolioConnected() || this.websocket.isRecommendationsConnected();

    // Check contracts
    health.contracts = this.contracts.isInitialized();

    // Check wallet
    const walletState = await this.wallet.getWalletState();
    health.wallet = walletState.isConnected;

    return health;
  }
}

// Create and export a singleton instance
export const apiClient = new ApiClient();

// Export the class for custom instances
export { ApiClient };
