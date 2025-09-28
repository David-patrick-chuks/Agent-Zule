import { API_ENDPOINTS, BACKEND_CONFIG } from '@/lib/constants';
import { ApiResponse, Permission } from '@/lib/types';

class PermissionService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = BACKEND_CONFIG.baseUrl;
  }

  async getPermissions(userAddress?: string): Promise<ApiResponse<Permission[]>> {
    try {
      const url = userAddress 
        ? `${this.baseUrl}${API_ENDPOINTS.permissions}?address=${userAddress}`
        : `${this.baseUrl}${API_ENDPOINTS.permissions}`;
        
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
      console.error('Permissions service error:', error);
      throw new Error('Failed to fetch permissions');
    }
  }

  async getPermission(permissionId: string): Promise<ApiResponse<Permission>> {
    try {
      const response = await fetch(`${this.baseUrl}${API_ENDPOINTS.permissions}/${permissionId}`, {
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
      console.error('Permission service error:', error);
      throw new Error('Failed to fetch permission');
    }
  }

  async createPermission(permissionData: Partial<Permission>): Promise<ApiResponse<Permission>> {
    try {
      const response = await fetch(`${this.baseUrl}${API_ENDPOINTS.permissions}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(permissionData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Create permission error:', error);
      throw new Error('Failed to create permission');
    }
  }

  async updatePermission(permissionId: string, permissionData: Partial<Permission>): Promise<ApiResponse<Permission>> {
    try {
      const response = await fetch(`${this.baseUrl}${API_ENDPOINTS.permissions}/${permissionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(permissionData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Update permission error:', error);
      throw new Error('Failed to update permission');
    }
  }

  async revokePermission(permissionId: string): Promise<ApiResponse<void>> {
    try {
      const response = await fetch(`${this.baseUrl}${API_ENDPOINTS.permissions}/${permissionId}`, {
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
      console.error('Revoke permission error:', error);
      throw new Error('Failed to revoke permission');
    }
  }

  async addCondition(permissionId: string, condition: any): Promise<ApiResponse<any>> {
    try {
      const response = await fetch(`${this.baseUrl}${API_ENDPOINTS.permissions}/${permissionId}/conditions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(condition),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Add condition error:', error);
      throw new Error('Failed to add condition');
    }
  }

  async removeCondition(permissionId: string, conditionId: string): Promise<ApiResponse<void>> {
    try {
      const response = await fetch(`${this.baseUrl}${API_ENDPOINTS.permissions}/${permissionId}/conditions/${conditionId}`, {
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
      console.error('Remove condition error:', error);
      throw new Error('Failed to remove condition');
    }
  }
}

export const permissionService = new PermissionService();
