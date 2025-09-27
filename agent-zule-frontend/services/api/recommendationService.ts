import { AIRecommendation, ApiResponse } from '@/lib/types';
import { API_ENDPOINTS } from '@/lib/constants';

class RecommendationService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
  }

  async getRecommendations(userAddress: string, status?: string): Promise<ApiResponse<AIRecommendation[]>> {
    try {
      const params = new URLSearchParams({ address: userAddress });
      if (status) {
        params.append('status', status);
      }

      const response = await fetch(`${this.baseUrl}${API_ENDPOINTS.recommendations}?${params}`, {
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
      console.error('Recommendations service error:', error);
      throw new Error('Failed to fetch recommendations');
    }
  }

  async voteOnRecommendation(
    recommendationId: string, 
    vote: 'approve' | 'reject', 
    reason?: string
  ): Promise<ApiResponse<any>> {
    try {
      const response = await fetch(`${this.baseUrl}${API_ENDPOINTS.recommendations}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'vote',
          recommendationId,
          vote,
          reason,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Vote recommendation error:', error);
      throw new Error('Failed to vote on recommendation');
    }
  }

  async executeRecommendation(recommendationId: string): Promise<ApiResponse<any>> {
    try {
      const response = await fetch(`${this.baseUrl}${API_ENDPOINTS.recommendations}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'execute',
          recommendationId,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Execute recommendation error:', error);
      throw new Error('Failed to execute recommendation');
    }
  }

  async getRecommendationDetails(recommendationId: string): Promise<ApiResponse<AIRecommendation>> {
    try {
      const response = await fetch(`${this.baseUrl}${API_ENDPOINTS.recommendations}/${recommendationId}`, {
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
      console.error('Recommendation details error:', error);
      throw new Error('Failed to fetch recommendation details');
    }
  }

  async getRecommendationHistory(userAddress: string, limit: number = 10): Promise<ApiResponse<AIRecommendation[]>> {
    try {
      const response = await fetch(`${this.baseUrl}${API_ENDPOINTS.recommendations}/history?address=${userAddress}&limit=${limit}`, {
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
      console.error('Recommendation history error:', error);
      throw new Error('Failed to fetch recommendation history');
    }
  }

  async getCommunityVotes(recommendationId: string): Promise<ApiResponse<any[]>> {
    try {
      const response = await fetch(`${this.baseUrl}${API_ENDPOINTS.recommendations}/${recommendationId}/votes`, {
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
      console.error('Community votes error:', error);
      throw new Error('Failed to fetch community votes');
    }
  }
}

export const recommendationService = new RecommendationService();
