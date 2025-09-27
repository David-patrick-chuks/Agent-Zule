import { Delegation, Permission, ApiResponse } from '@/lib/types';
import { API_ENDPOINTS } from '@/lib/constants';

class PermissionService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
  }

  async getDelegations(userAddress: string): Promise<ApiResponse<Delegation[]>> {
    try {
      const response = await fetch(`${this.baseUrl}${API_ENDPOINTS.delegations}?address=${userAddress}`, {
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
      console.error('Delegations service error:', error);
      throw new Error('Failed to fetch delegations');
    }
  }

  async createDelegation(
    userAddress: string,
    permissions: Permission[],
    riskSettings: any
  ): Promise<ApiResponse<Delegation>> {
    try {
      const response = await fetch(`${this.baseUrl}${API_ENDPOINTS.delegations}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'create',
          userAddress,
          permissions,
          riskSettings,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Create delegation error:', error);
      throw new Error('Failed to create delegation');
    }
  }

  async updateDelegation(
    delegationId: string,
    permissions: Permission[],
    riskSettings: any
  ): Promise<ApiResponse<Delegation>> {
    try {
      const response = await fetch(`${this.baseUrl}${API_ENDPOINTS.delegations}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'update',
          delegationId,
          permissions,
          riskSettings,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Update delegation error:', error);
      throw new Error('Failed to update delegation');
    }
  }

  async revokeDelegation(delegationId: string): Promise<ApiResponse<any>> {
    try {
      const response = await fetch(`${this.baseUrl}${API_ENDPOINTS.delegations}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'revoke',
          delegationId,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Revoke delegation error:', error);
      throw new Error('Failed to revoke delegation');
    }
  }

  async autoRevokeDelegation(delegationId: string, reason: string): Promise<ApiResponse<any>> {
    try {
      const response = await fetch(`${this.baseUrl}${API_ENDPOINTS.delegations}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'auto_revoke',
          delegationId,
          reason,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Auto-revoke delegation error:', error);
      throw new Error('Failed to auto-revoke delegation');
    }
  }

  async getDelegationHistory(userAddress: string): Promise<ApiResponse<any[]>> {
    try {
      const response = await fetch(`${this.baseUrl}${API_ENDPOINTS.delegations}/history?address=${userAddress}`, {
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
      console.error('Delegation history error:', error);
      throw new Error('Failed to fetch delegation history');
    }
  }

  async checkPermissionStatus(
    userAddress: string,
    permissionType: string
  ): Promise<ApiResponse<boolean>> {
    try {
      const response = await fetch(`${this.baseUrl}${API_ENDPOINTS.delegations}/check?address=${userAddress}&permission=${permissionType}`, {
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
      console.error('Permission check error:', error);
      throw new Error('Failed to check permission status');
    }
  }
}

export const permissionService = new PermissionService();
