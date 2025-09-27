'use client';

import { useState, useEffect, useCallback } from 'react';
import { Portfolio } from '@/lib/types';
import { portfolioService } from '@/services/api/portfolioService';
import { POLLING_INTERVALS } from '@/lib/constants';

export function usePortfolio(userAddress?: string) {
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchPortfolio = useCallback(async () => {
    if (!userAddress) return;

    setLoading(true);
    setError(null);

    try {
      const response = await portfolioService.getPortfolio(userAddress);
      if (response.success) {
        setPortfolio(response.data);
        setLastUpdated(new Date());
      } else {
        throw new Error(response.message || 'Failed to fetch portfolio');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch portfolio';
      setError(errorMessage);
      console.error('Portfolio fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [userAddress]);

  const refreshPortfolio = useCallback(async () => {
    if (!userAddress) return;

    setLoading(true);
    setError(null);

    try {
      const response = await portfolioService.refreshPortfolio(userAddress);
      if (response.success) {
        setPortfolio(response.data);
        setLastUpdated(new Date());
      } else {
        throw new Error(response.message || 'Failed to refresh portfolio');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to refresh portfolio';
      setError(errorMessage);
      console.error('Portfolio refresh error:', err);
    } finally {
      setLoading(false);
    }
  }, [userAddress]);

  const rebalancePortfolio = useCallback(async () => {
    if (!userAddress) return;

    setLoading(true);
    setError(null);

    try {
      const response = await portfolioService.rebalancePortfolio(userAddress);
      if (response.success) {
        setPortfolio(response.data);
        setLastUpdated(new Date());
      } else {
        throw new Error(response.message || 'Failed to rebalance portfolio');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to rebalance portfolio';
      setError(errorMessage);
      console.error('Portfolio rebalance error:', err);
    } finally {
      setLoading(false);
    }
  }, [userAddress]);

  const getPortfolioHistory = useCallback(async (timeframe: string = '7d') => {
    if (!userAddress) return null;

    try {
      const response = await portfolioService.getPortfolioHistory(userAddress, timeframe);
      if (response.success) {
        return response.data;
      } else {
        throw new Error(response.message || 'Failed to fetch portfolio history');
      }
    } catch (err) {
      console.error('Portfolio history error:', err);
      throw err;
    }
  }, [userAddress]);

  const getPortfolioPerformance = useCallback(async () => {
    if (!userAddress) return null;

    try {
      const response = await portfolioService.getPortfolioPerformance(userAddress);
      if (response.success) {
        return response.data;
      } else {
        throw new Error(response.message || 'Failed to fetch portfolio performance');
      }
    } catch (err) {
      console.error('Portfolio performance error:', err);
      throw err;
    }
  }, [userAddress]);

  // Initial fetch
  useEffect(() => {
    if (userAddress) {
      fetchPortfolio();
    }
  }, [userAddress, fetchPortfolio]);

  // Auto-refresh polling
  useEffect(() => {
    if (!userAddress) return;

    const interval = setInterval(() => {
      fetchPortfolio();
    }, POLLING_INTERVALS.portfolio);

    return () => clearInterval(interval);
  }, [userAddress, fetchPortfolio]);

  return {
    portfolio,
    loading,
    error,
    lastUpdated,
    fetchPortfolio,
    refreshPortfolio,
    rebalancePortfolio,
    getPortfolioHistory,
    getPortfolioPerformance,
  };
}
