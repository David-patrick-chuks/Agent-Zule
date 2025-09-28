import { BACKEND_CONFIG, API_ENDPOINTS } from '@/lib/constants';

interface WebSocketMessage {
  type: string;
  data: any;
  timestamp: string;
}

interface WebSocketCallbacks {
  onPortfolioUpdate?: (data: any) => void;
  onRecommendationUpdate?: (data: any) => void;
  onPermissionUpdate?: (data: any) => void;
  onExecutionUpdate?: (data: any) => void;
  onMarketDataUpdate?: (data: any) => void;
  onError?: (error: Error) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

class WebSocketService {
  private portfolioWs: WebSocket | null = null;
  private recommendationsWs: WebSocket | null = null;
  private callbacks: WebSocketCallbacks = {};
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval = 5000; // 5 seconds

  constructor() {
    // Auto-reconnect on page visibility change
    if (typeof window !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && this.shouldReconnect()) {
          this.reconnect();
        }
      });
    }
  }

  setCallbacks(callbacks: WebSocketCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  async connectToPortfolioUpdates(portfolioId: string): Promise<void> {
    if (this.portfolioWs?.readyState === WebSocket.OPEN) {
      this.disconnectPortfolio();
    }

    try {
      const wsUrl = this.getWebSocketUrl(API_ENDPOINTS.wsPortfolio, { portfolioId });
      this.portfolioWs = new WebSocket(wsUrl);

      this.setupWebSocketHandlers(this.portfolioWs, 'portfolio');
      this.callbacks.onConnect?.();
    } catch (error) {
      console.error('Failed to connect to portfolio WebSocket:', error);
      this.callbacks.onError?.(error as Error);
    }
  }

  async connectToRecommendationUpdates(): Promise<void> {
    if (this.recommendationsWs?.readyState === WebSocket.OPEN) {
      this.disconnectRecommendations();
    }

    try {
      const wsUrl = this.getWebSocketUrl(API_ENDPOINTS.wsRecommendations);
      this.recommendationsWs = new WebSocket(wsUrl);

      this.setupWebSocketHandlers(this.recommendationsWs, 'recommendations');
      this.callbacks.onConnect?.();
    } catch (error) {
      console.error('Failed to connect to recommendations WebSocket:', error);
      this.callbacks.onError?.(error as Error);
    }
  }

  private getWebSocketUrl(endpoint: string, params?: Record<string, string>): string {
    const baseUrl = BACKEND_CONFIG.baseUrl.replace('http', 'ws');
    let url = `${baseUrl}${endpoint}`;
    
    if (params) {
      const searchParams = new URLSearchParams(params);
      url += `?${searchParams.toString()}`;
    }
    
    return url;
  }

  private setupWebSocketHandlers(ws: WebSocket, type: 'portfolio' | 'recommendations'): void {
    ws.onopen = () => {
      console.log(`${type} WebSocket connected`);
      this.reconnectAttempts = 0;
      this.callbacks.onConnect?.();
    };

    ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        this.handleMessage(message, type);
      } catch (error) {
        console.error(`Error parsing ${type} WebSocket message:`, error);
        this.callbacks.onError?.(error as Error);
      }
    };

    ws.onclose = (event) => {
      console.log(`${type} WebSocket disconnected:`, event.code, event.reason);
      this.callbacks.onDisconnect?.();
      
      if (!event.wasClean && this.shouldReconnect()) {
        this.scheduleReconnect(() => {
          if (type === 'portfolio') {
            // Note: We'd need to store the portfolioId to reconnect
            console.warn('Portfolio WebSocket reconnection requires portfolioId');
          } else {
            this.connectToRecommendationUpdates();
          }
        });
      }
    };

    ws.onerror = (error) => {
      console.error(`${type} WebSocket error:`, error);
      this.callbacks.onError?.(new Error(`WebSocket error: ${error}`));
    };
  }

  private handleMessage(message: WebSocketMessage, type: 'portfolio' | 'recommendations'): void {
    switch (message.type) {
      case 'portfolio_update':
        this.callbacks.onPortfolioUpdate?.(message.data);
        break;
      case 'recommendation_update':
        this.callbacks.onRecommendationUpdate?.(message.data);
        break;
      case 'permission_update':
        this.callbacks.onPermissionUpdate?.(message.data);
        break;
      case 'execution_update':
        this.callbacks.onExecutionUpdate?.(message.data);
        break;
      case 'market_data_update':
        this.callbacks.onMarketDataUpdate?.(message.data);
        break;
      default:
        console.warn(`Unknown message type: ${message.type}`);
    }
  }

  private shouldReconnect(): boolean {
    return this.reconnectAttempts < this.maxReconnectAttempts;
  }

  private scheduleReconnect(reconnectFn: () => void): void {
    this.reconnectAttempts++;
    const delay = this.reconnectInterval * Math.pow(2, this.reconnectAttempts - 1);
    
    setTimeout(() => {
      if (this.shouldReconnect()) {
        reconnectFn();
      }
    }, delay);
  }

  private reconnect(): void {
    // Reconnect logic would be implemented here
    // This would need to store connection parameters to properly reconnect
  }

  disconnectPortfolio(): void {
    if (this.portfolioWs) {
      this.portfolioWs.close();
      this.portfolioWs = null;
    }
  }

  disconnectRecommendations(): void {
    if (this.recommendationsWs) {
      this.recommendationsWs.close();
      this.recommendationsWs = null;
    }
  }

  disconnectAll(): void {
    this.disconnectPortfolio();
    this.disconnectRecommendations();
  }

  isPortfolioConnected(): boolean {
    return this.portfolioWs?.readyState === WebSocket.OPEN;
  }

  isRecommendationsConnected(): boolean {
    return this.recommendationsWs?.readyState === WebSocket.OPEN;
  }

  // Send message methods (if bidirectional communication is needed)
  sendPortfolioMessage(message: any): void {
    if (this.isPortfolioConnected() && this.portfolioWs) {
      this.portfolioWs.send(JSON.stringify(message));
    }
  }

  sendRecommendationMessage(message: any): void {
    if (this.isRecommendationsConnected() && this.recommendationsWs) {
      this.recommendationsWs.send(JSON.stringify(message));
    }
  }

  // Subscription management
  subscribeToPortfolio(portfolioId: string): void {
    this.sendPortfolioMessage({
      type: 'subscribe',
      data: { portfolioId }
    });
  }

  subscribeToRecommendations(): void {
    this.sendRecommendationMessage({
      type: 'subscribe',
      data: {}
    });
  }

  unsubscribeFromPortfolio(portfolioId: string): void {
    this.sendPortfolioMessage({
      type: 'unsubscribe',
      data: { portfolioId }
    });
  }

  unsubscribeFromRecommendations(): void {
    this.sendRecommendationMessage({
      type: 'unsubscribe',
      data: {}
    });
  }
}

export const websocketService = new WebSocketService();
export { WebSocketService };
