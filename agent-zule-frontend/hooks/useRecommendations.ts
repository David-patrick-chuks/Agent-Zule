'use client';

import { useState, useEffect, useCallback } from 'react';
import { AIRecommendation } from '@/lib/types';
import { recommendationService } from '@/services/api/recommendationService';
import { POLLING_INTERVALS } from '@/lib/constants';

export function useRecommendations(userAddress?: string) {
  const [recommendations, setRecommendations] = useState<AIRecommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchRecommendations = useCallback(async (status?: string) => {
    if (!userAddress) return;

    setLoading(true);
    setError(null);

    try {
      const response = await recommendationService.getRecommendations(userAddress, status);
      if (response.success) {
        setRecommendations(response.data);
        setLastUpdated(new Date());
      } else {
        throw new Error(response.message || 'Failed to fetch recommendations');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch recommendations';
      setError(errorMessage);
      console.error('Recommendations fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [userAddress]);

  const voteOnRecommendation = useCallback(async (
    recommendationId: string,
    vote: 'approve' | 'reject',
    reason?: string
  ) => {
    try {
      const response = await recommendationService.voteOnRecommendation(recommendationId, vote, reason);
      if (response.success) {
        // Refresh recommendations after voting
        await fetchRecommendations();
        return true;
      } else {
        throw new Error(response.message || 'Failed to vote on recommendation');
      }
    } catch (err) {
      console.error('Vote error:', err);
      throw err;
    }
  }, [fetchRecommendations]);

  const executeRecommendation = useCallback(async (recommendationId: string) => {
    try {
      const response = await recommendationService.executeRecommendation(recommendationId);
      if (response.success) {
        // Refresh recommendations after execution
        await fetchRecommendations();
        return true;
      } else {
        throw new Error(response.message || 'Failed to execute recommendation');
      }
    } catch (err) {
      console.error('Execute recommendation error:', err);
      throw err;
    }
  }, [fetchRecommendations]);

  const getRecommendationDetails = useCallback(async (recommendationId: string) => {
    try {
      const response = await recommendationService.getRecommendationDetails(recommendationId);
      if (response.success) {
        return response.data;
      } else {
        throw new Error(response.message || 'Failed to fetch recommendation details');
      }
    } catch (err) {
      console.error('Recommendation details error:', err);
      throw err;
    }
  }, []);

  const getRecommendationHistory = useCallback(async (limit: number = 10) => {
    if (!userAddress) return [];

    try {
      const response = await recommendationService.getRecommendationHistory(userAddress, limit);
      if (response.success) {
        return response.data;
      } else {
        throw new Error(response.message || 'Failed to fetch recommendation history');
      }
    } catch (err) {
      console.error('Recommendation history error:', err);
      throw err;
    }
  }, [userAddress]);

  const getCommunityVotes = useCallback(async (recommendationId: string) => {
    try {
      const response = await recommendationService.getCommunityVotes(recommendationId);
      if (response.success) {
        return response.data;
      } else {
        throw new Error(response.message || 'Failed to fetch community votes');
      }
    } catch (err) {
      console.error('Community votes error:', err);
      throw err;
    }
  }, []);

  // Get recommendations by status
  const getPendingRecommendations = useCallback(() => {
    return recommendations.filter(rec => rec.status === 'pending');
  }, [recommendations]);

  const getApprovedRecommendations = useCallback(() => {
    return recommendations.filter(rec => rec.status === 'approved');
  }, [recommendations]);

  const getRejectedRecommendations = useCallback(() => {
    return recommendations.filter(rec => rec.status === 'rejected');
  }, [recommendations]);

  const getExecutedRecommendations = useCallback(() => {
    return recommendations.filter(rec => rec.status === 'executed');
  }, [recommendations]);

  // Get recommendations by type
  const getRecommendationsByType = useCallback((type: string) => {
    return recommendations.filter(rec => rec.type === type);
  }, [recommendations]);

  // Get high-confidence recommendations
  const getHighConfidenceRecommendations = useCallback((threshold: number = 80) => {
    return recommendations.filter(rec => rec.confidence >= threshold);
  }, [recommendations]);

  // Get high-impact recommendations
  const getHighImpactRecommendations = useCallback(() => {
    return recommendations.filter(rec => rec.impact === 'high');
  }, [recommendations]);

  // Initial fetch
  useEffect(() => {
    if (userAddress) {
      fetchRecommendations();
    }
  }, [userAddress, fetchRecommendations]);

  // Auto-refresh polling
  useEffect(() => {
    if (!userAddress) return;

    const interval = setInterval(() => {
      fetchRecommendations();
    }, POLLING_INTERVALS.recommendations);

    return () => clearInterval(interval);
  }, [userAddress, fetchRecommendations]);

  return {
    recommendations,
    loading,
    error,
    lastUpdated,
    fetchRecommendations,
    voteOnRecommendation,
    executeRecommendation,
    getRecommendationDetails,
    getRecommendationHistory,
    getCommunityVotes,
    getPendingRecommendations,
    getApprovedRecommendations,
    getRejectedRecommendations,
    getExecutedRecommendations,
    getRecommendationsByType,
    getHighConfidenceRecommendations,
    getHighImpactRecommendations,
  };
}
