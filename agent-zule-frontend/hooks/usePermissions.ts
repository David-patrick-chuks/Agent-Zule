'use client';

import { POLLING_INTERVALS } from '@/lib/constants';
import { Delegation, Permission } from '@/lib/types';
import { permissionService } from '@/services/api/permissionService';
import { useCallback, useEffect, useState } from 'react';

export function usePermissions(userAddress?: string) {
  const [delegations, setDelegations] = useState<Delegation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchDelegations = useCallback(async () => {
    if (!userAddress) return;

    setLoading(true);
    setError(null);

    try {
      const response = await permissionService.getDelegations(userAddress);
      if (response.success) {
        setDelegations(response.data);
        setLastUpdated(new Date());
      } else {
        throw new Error(response.message || 'Failed to fetch delegations');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch delegations';
      setError(errorMessage);
      console.error('Delegations fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [userAddress]);

  const createDelegation = useCallback(async (
    permissions: Permission[],
    riskSettings: any
  ) => {
    if (!userAddress) return false;

    try {
      const response = await permissionService.createDelegation(userAddress, permissions, riskSettings);
      if (response.success) {
        // Refresh delegations after creation
        await fetchDelegations();
        return true;
      } else {
        throw new Error(response.message || 'Failed to create delegation');
      }
    } catch (err) {
      console.error('Create delegation error:', err);
      throw err;
    }
  }, [userAddress, fetchDelegations]);

  const updateDelegation = useCallback(async (
    delegationId: string,
    permissions: Permission[],
    riskSettings: any
  ) => {
    try {
      const response = await permissionService.updateDelegation(delegationId, permissions, riskSettings);
      if (response.success) {
        // Refresh delegations after update
        await fetchDelegations();
        return true;
      } else {
        throw new Error(response.message || 'Failed to update delegation');
      }
    } catch (err) {
      console.error('Update delegation error:', err);
      throw err;
    }
  }, [fetchDelegations]);

  const revokeDelegation = useCallback(async (delegationId: string) => {
    try {
      const response = await permissionService.revokeDelegation(delegationId);
      if (response.success) {
        // Refresh delegations after revocation
        await fetchDelegations();
        return true;
      } else {
        throw new Error(response.message || 'Failed to revoke delegation');
      }
    } catch (err) {
      console.error('Revoke delegation error:', err);
      throw err;
    }
  }, [fetchDelegations]);

  const autoRevokeDelegation = useCallback(async (delegationId: string, reason: string) => {
    try {
      const response = await permissionService.autoRevokeDelegation(delegationId, reason);
      if (response.success) {
        // Refresh delegations after auto-revoke
        await fetchDelegations();
        return true;
      } else {
        throw new Error(response.message || 'Failed to auto-revoke delegation');
      }
    } catch (err) {
      console.error('Auto-revoke delegation error:', err);
      throw err;
    }
  }, [fetchDelegations]);

  const getDelegationHistory = useCallback(async () => {
    if (!userAddress) return [];

    try {
      const response = await permissionService.getDelegationHistory(userAddress);
      if (response.success) {
        return response.data;
      } else {
        throw new Error(response.message || 'Failed to fetch delegation history');
      }
    } catch (err) {
      console.error('Delegation history error:', err);
      throw err;
    }
  }, [userAddress]);

  const checkPermissionStatus = useCallback(async (permissionType: string) => {
    if (!userAddress) return false;

    try {
      const response = await permissionService.checkPermissionStatus(userAddress, permissionType);
      if (response.success) {
        return response.data;
      } else {
        throw new Error(response.message || 'Failed to check permission status');
      }
    } catch (err) {
      console.error('Permission check error:', err);
      throw err;
    }
  }, [userAddress]);

  // Get active delegations
  const getActiveDelegations = useCallback(() => {
    return delegations.filter(delegation => delegation.isActive);
  }, [delegations]);

  // Get expired delegations
  const getExpiredDelegations = useCallback(() => {
    const now = new Date();
    return delegations.filter(delegation => 
      delegation.expiresAt && new Date(delegation.expiresAt) < now
    );
  }, [delegations]);

  // Get delegations by permission type
  const getDelegationsByPermission = useCallback((permissionType: string) => {
    return delegations.filter(delegation => 
      delegation.permissions.some(permission => 
        permission.type === permissionType && permission.isGranted
      )
    );
  }, [delegations]);

  // Check if user has specific permission
  const hasPermission = useCallback((permissionType: string) => {
    return delegations.some(delegation => 
      delegation.isActive && 
      delegation.permissions.some(permission => 
        permission.type === permissionType && permission.isGranted
      )
    );
  }, [delegations]);

  // Get risk settings from active delegation
  const getRiskSettings = useCallback(() => {
    const activeDelegation = delegations.find(delegation => delegation.isActive);
    if (activeDelegation) {
      return {
        maxTransactionValue: activeDelegation.maxTransactionValue,
        riskThreshold: activeDelegation.riskThreshold,
        autoRevokeOnHighVolatility: activeDelegation.autoRevokeOnHighVolatility,
      };
    }
    return null;
  }, [delegations]);

  // Initial fetch
  useEffect(() => {
    if (userAddress) {
      fetchDelegations();
    }
  }, [userAddress, fetchDelegations]);

  // Auto-refresh polling
  useEffect(() => {
    if (!userAddress) return;

    const interval = setInterval(() => {
      fetchDelegations();
    }, POLLING_INTERVALS.delegations);

    return () => clearInterval(interval);
  }, [userAddress, fetchDelegations]);

  return {
    delegations,
    loading,
    error,
    lastUpdated,
    fetchDelegations,
    createDelegation,
    updateDelegation,
    revokeDelegation,
    autoRevokeDelegation,
    getDelegationHistory,
    checkPermissionStatus,
    getActiveDelegations,
    getExpiredDelegations,
    getDelegationsByPermission,
    hasPermission,
    getRiskSettings,
  };
}
