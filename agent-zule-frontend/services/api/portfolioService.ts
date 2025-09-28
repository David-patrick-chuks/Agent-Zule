import { Portfolio, ApiResponse } from '@/lib/types';
import { API_ENDPOINTS, BACKEND_CONFIG } from '@/lib/constants';

class PortfolioService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = BACKEND_CONFIG.baseUrl;
  }

  async getPortfolios(userAddress?: string): Promise<ApiResponse<Portfolio[]>> {
    try {
      const url = userAddress 
        ? `${this.baseUrl}${API_ENDPOINTS.portfolios}?address=${userAddress}`
        : `${this.baseUrl}${API_ENDPOINTS.portfolios}`;
        
      const response = await fetch(url, {
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

  async getPortfolio(portfolioId: string): Promise<ApiResponse<Portfolio>> {
    try {
      const response = await fetch(`${this.baseUrl}${API_ENDPOINTS.portfolios}/${portfolioId}`, {
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

  async createPortfolio(portfolioData: Partial<Portfolio>): Promise<ApiResponse<Portfolio>> {
    try {
      const response = await fetch(`${this.baseUrl}${API_ENDPOINTS.portfolios}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(portfolioData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Portfolio creation error:', error);
      throw new Error('Failed to create portfolio');
    }
  }

  async updatePortfolio(portfolioId: string, portfolioData: Partial<Portfolio>): Promise<ApiResponse<Portfolio>> {
    try {
      const response = await fetch(`${this.baseUrl}${API_ENDPOINTS.portfolios}/${portfolioId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(portfolioData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Portfolio update error:', error);
      throw new Error('Failed to update portfolio');
    }
  }

  async analyzePortfolio(portfolioId: string): Promise<ApiResponse<any>> {
    try {
      const response = await fetch(`${this.baseUrl}${API_ENDPOINTS.portfolios}/${portfolioId}/analysis`, {
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
      console.error('Portfolio analysis error:', error);
      throw new Error('Failed to analyze portfolio');
    }
  }

  async getPortfolioHistory(portfolioId: string, timeframe: string = '7d'): Promise<ApiResponse<any[]>> {
    try {
      const response = await fetch(`${this.baseUrl}${API_ENDPOINTS.portfolios}/${portfolioId}/history?timeframe=${timeframe}`, {
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

  async deletePortfolio(portfolioId: string): Promise<ApiResponse<void>> {
    try {
      const response = await fetch(`${this.baseUrl}${API_ENDPOINTS.portfolios}/${portfolioId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Portfolio deletion error:', error);
      throw new Error('Failed to delete portfolio');
    }
  }

  // AI-powered methods
  async analyzeWithAI(portfolioId: string, analysisParams?: any): Promise<ApiResponse<any>> {
    try {
      const response = await fetch(`${this.baseUrl}${API_ENDPOINTS.aiAnalyze}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          portfolioId,
          ...analysisParams,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('AI analysis error:', error);
      throw new Error('Failed to analyze portfolio with AI');
    }
  }

  async assessRisk(portfolioId: string): Promise<ApiResponse<any>> {
    try {
      const response = await fetch(`${this.baseUrl}${API_ENDPOINTS.aiRiskAssessment}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          portfolioId,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Risk assessment error:', error);
      throw new Error('Failed to assess portfolio risk');
    }
  }
}

export const portfolioService = new PortfolioService();
