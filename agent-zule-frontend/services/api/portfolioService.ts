import { Portfolio, ApiResponse } from '@/lib/types';
import { API_ENDPOINTS } from '@/lib/constants';

class PortfolioService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
  }

  async getPortfolio(userAddress: string): Promise<ApiResponse<Portfolio>> {
    try {
      const response = await fetch(`${this.baseUrl}${API_ENDPOINTS.portfolio}?address=${userAddress}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Portfolio service error:', error);
      throw new Error('Failed to fetch portfolio data');
    }
  }

  async refreshPortfolio(userAddress: string): Promise<ApiResponse<Portfolio>> {
    try {
      const response = await fetch(`${this.baseUrl}${API_ENDPOINTS.portfolio}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'refresh',
          userAddress,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Portfolio refresh error:', error);
      throw new Error('Failed to refresh portfolio');
    }
  }

  async rebalancePortfolio(userAddress: string): Promise<ApiResponse<Portfolio>> {
    try {
      const response = await fetch(`${this.baseUrl}${API_ENDPOINTS.portfolio}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'rebalance',
          userAddress,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Portfolio rebalance error:', error);
      throw new Error('Failed to rebalance portfolio');
    }
  }

  async getPortfolioHistory(userAddress: string, timeframe: string = '7d'): Promise<ApiResponse<any[]>> {
    try {
      const response = await fetch(`${this.baseUrl}${API_ENDPOINTS.portfolio}/history?address=${userAddress}&timeframe=${timeframe}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Portfolio history error:', error);
      throw new Error('Failed to fetch portfolio history');
    }
  }

  async getPortfolioPerformance(userAddress: string): Promise<ApiResponse<any>> {
    try {
      const response = await fetch(`${this.baseUrl}${API_ENDPOINTS.portfolio}/performance?address=${userAddress}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Portfolio performance error:', error);
      throw new Error('Failed to fetch portfolio performance');
    }
  }
}

export const portfolioService = new PortfolioService();
