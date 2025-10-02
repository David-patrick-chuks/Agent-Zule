'use client';

import { useEffect, useState } from 'react';
import { useWebSocket } from './useWebSocket';

interface PortfolioUpdate {
  userId: string;
  totalValue: number;
  pnl: number;
  positions?: any[];
  lastUpdated: string;
}

interface RecommendationUpdate {
  recommendations: any[];
  timestamp: string;
}

interface PermissionUpdate {
  type: 'auto_revoke' | 'permission_granted' | 'permission_revoked';
  data: any;
  timestamp: string;
}

export function useRealTimePortfolio(userId?: string) {
  const [portfolioData, setPortfolioData] = useState<PortfolioUpdate | null>(null);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [permissionAlerts, setPermissionAlerts] = useState<PermissionUpdate[]>([]);
  const [marketData, setMarketData] = useState<any>(null);
  
  const { isConnected, lastMessage, subscribe, unsubscribe, emit } = useWebSocket(userId);

  // Subscribe to relevant channels when connected
  useEffect(() => {
    if (isConnected && userId) {
      subscribe('portfolio');
      subscribe('recommendations');
      subscribe('permissions');
      subscribe('market_data');
    }

    return () => {
      if (isConnected) {
        unsubscribe('portfolio');
        unsubscribe('recommendations');
        unsubscribe('permissions');
        unsubscribe('market_data');
      }
    };
  }, [isConnected, userId, subscribe, unsubscribe]);

  // Handle incoming messages
  useEffect(() => {
    if (!lastMessage) return;

    switch (lastMessage.type) {
      case 'portfolio_update':
        setPortfolioData(lastMessage.data);
        break;
      
      case 'recommendations_update':
        setRecommendations(lastMessage.data.recommendations || []);
        break;
      
      case 'permission_update':
        setPermissionAlerts(prev => [...prev, lastMessage.data]);
        break;
      
      case 'market_update':
        setMarketData(lastMessage.data);
        break;
      
      default:
        console.log('Unknown message type:', lastMessage.type);
    }
  }, [lastMessage]);

  // Helper functions to trigger specific updates
  const requestPortfolioUpdate = () => {
    if (userId) {
      emit('custom_event', {
        type: 'portfolio_update',
        userId
      });
    }
  };

  const requestRecommendations = () => {
    if (userId) {
      emit('custom_event', {
        type: 'recommendation_request',
        userId
      });
    }
  };

  const checkPermissions = (action: string, amount?: number) => {
    if (userId) {
      emit('custom_event', {
        type: 'permission_check',
        userId,
        action,
        amount
      });
    }
  };

  const clearPermissionAlerts = () => {
    setPermissionAlerts([]);
  };

  return {
    // Connection status
    isConnected,
    
    // Real-time data
    portfolioData,
    recommendations,
    permissionAlerts,
    marketData,
    
    // Actions
    requestPortfolioUpdate,
    requestRecommendations,
    checkPermissions,
    clearPermissionAlerts,
    
    // Raw emit function for custom events
    emit
  };
}
