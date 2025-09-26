import { Portfolio } from '@/lib/types';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface PortfolioState {
  portfolio: Portfolio | null;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  refreshInterval: number | null;
}

interface PortfolioActions {
  setPortfolio: (portfolio: Portfolio | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setLastUpdated: (date: Date | null) => void;
  clearError: () => void;
  startRefresh: (interval: number) => void;
  stopRefresh: () => void;
  reset: () => void;
}

type PortfolioStore = PortfolioState & PortfolioActions;

const initialState: PortfolioState = {
  portfolio: null,
  loading: false,
  error: null,
  lastUpdated: null,
  refreshInterval: null,
};

export const usePortfolioStore = create<PortfolioStore>()(
  devtools(
    (set, get) => ({
      ...initialState,

      setPortfolio: (portfolio) => {
        set({ portfolio, lastUpdated: new Date() }, false, 'setPortfolio');
      },

      setLoading: (loading) => {
        set({ loading }, false, 'setLoading');
      },

      setError: (error) => {
        set({ error }, false, 'setError');
      },

      setLastUpdated: (lastUpdated) => {
        set({ lastUpdated }, false, 'setLastUpdated');
      },

      clearError: () => {
        set({ error: null }, false, 'clearError');
      },

      startRefresh: (interval) => {
        const currentInterval = get().refreshInterval;
        if (currentInterval) {
          clearInterval(currentInterval);
        }

        const newInterval = setInterval(() => {
          // This would trigger a portfolio refresh in the component
          set({ lastUpdated: new Date() }, false, 'refreshTick');
        }, interval);

        set({ refreshInterval: newInterval }, false, 'startRefresh');
      },

      stopRefresh: () => {
        const interval = get().refreshInterval;
        if (interval) {
          clearInterval(interval);
          set({ refreshInterval: null }, false, 'stopRefresh');
        }
      },

      reset: () => {
        const interval = get().refreshInterval;
        if (interval) {
          clearInterval(interval);
        }
        set(initialState, false, 'reset');
      },
    }),
    {
      name: 'portfolio-store',
    }
  )
);

// Selectors for common use cases
export const usePortfolio = () => usePortfolioStore((state) => state.portfolio);
export const usePortfolioLoading = () => usePortfolioStore((state) => state.loading);
export const usePortfolioError = () => usePortfolioStore((state) => state.error);
export const usePortfolioLastUpdated = () => usePortfolioStore((state) => state.lastUpdated);
