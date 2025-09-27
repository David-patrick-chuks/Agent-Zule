import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { Delegation, Permission } from '@/lib/types';

interface PermissionState {
  delegations: Delegation[];
  activeDelegation: Delegation | null;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

interface PermissionActions {
  setDelegations: (delegations: Delegation[]) => void;
  setActiveDelegation: (delegation: Delegation | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setLastUpdated: (date: Date | null) => void;
  addDelegation: (delegation: Delegation) => void;
  updateDelegation: (id: string, updates: Partial<Delegation>) => void;
  removeDelegation: (id: string) => void;
  clearError: () => void;
  reset: () => void;
}

type PermissionStore = PermissionState & PermissionActions;

const initialState: PermissionState = {
  delegations: [],
  activeDelegation: null,
  loading: false,
  error: null,
  lastUpdated: null,
};

export const usePermissionStore = create<PermissionStore>()(
  devtools(
    (set, get) => ({
      ...initialState,

      setDelegations: (delegations) => {
        const activeDelegation = delegations.find(d => d.isActive) || null;
        set({ 
          delegations, 
          activeDelegation, 
          lastUpdated: new Date() 
        }, false, 'setDelegations');
      },

      setActiveDelegation: (activeDelegation) => {
        set({ activeDelegation }, false, 'setActiveDelegation');
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

      addDelegation: (delegation) => {
        set((state) => ({
          delegations: [...state.delegations, delegation],
          lastUpdated: new Date(),
        }), false, 'addDelegation');
      },

      updateDelegation: (id, updates) => {
        set((state) => ({
          delegations: state.delegations.map(d => 
            d.id === id ? { ...d, ...updates } : d
          ),
          lastUpdated: new Date(),
        }), false, 'updateDelegation');
      },

      removeDelegation: (id) => {
        set((state) => ({
          delegations: state.delegations.filter(d => d.id !== id),
          lastUpdated: new Date(),
        }), false, 'removeDelegation');
      },

      clearError: () => {
        set({ error: null }, false, 'clearError');
      },

      reset: () => {
        set(initialState, false, 'reset');
      },
    }),
    {
      name: 'permission-store',
    }
  )
);

// Selectors for common use cases
export const useDelegations = () => usePermissionStore((state) => state.delegations);
export const useActiveDelegation = () => usePermissionStore((state) => state.activeDelegation);
export const usePermissionLoading = () => usePermissionStore((state) => state.loading);
export const usePermissionError = () => usePermissionStore((state) => state.error);
export const usePermissionLastUpdated = () => usePermissionStore((state) => state.lastUpdated);

// Computed selectors
export const useActivePermissions = () => 
  usePermissionStore((state) => 
    state.activeDelegation?.permissions.filter(p => p.isGranted) || []
  );

export const useHasPermission = (permissionType: string) =>
  usePermissionStore((state) =>
    state.activeDelegation?.permissions.some(p => 
      p.type === permissionType && p.isGranted
    ) || false
  );

export const useRiskSettings = () =>
  usePermissionStore((state) => {
    const delegation = state.activeDelegation;
    if (!delegation) return null;
    
    return {
      maxTransactionValue: delegation.maxTransactionValue,
      riskThreshold: delegation.riskThreshold,
      autoRevokeOnHighVolatility: delegation.autoRevokeOnHighVolatility,
    };
  });
