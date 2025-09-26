'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import {
    AlertTriangle,
    BarChart3,
    CheckCircle,
    DollarSign,
    Settings,
    Shield,
    Zap
} from 'lucide-react';
import { useState } from 'react';

// Mock data - in production this would come from API
const delegationData = {
  isActive: true,
  delegateAddress: '0xabcdef1234567890abcdef1234567890abcdef12',
  permissions: [
    {
      id: '1',
      type: 'swap',
      label: 'Token Swaps',
      isGranted: true,
      maxAmount: 1000,
      maxSlippage: 1.0,
    },
    {
      id: '2',
      type: 'add_liquidity',
      label: 'Add Liquidity',
      isGranted: true,
      maxAmount: 500,
      maxSlippage: 0.5,
    },
    {
      id: '3',
      type: 'remove_liquidity',
      label: 'Remove Liquidity',
      isGranted: false,
      maxAmount: 0,
      maxSlippage: 0,
    },
    {
      id: '4',
      type: 'stake',
      label: 'Staking',
      isGranted: true,
      maxAmount: 2000,
      maxSlippage: 0.5,
    },
    {
      id: '5',
      type: 'unstake',
      label: 'Unstaking',
      isGranted: false,
      maxAmount: 0,
      maxSlippage: 0,
    },
    {
      id: '6',
      type: 'transfer',
      label: 'Transfers',
      isGranted: false,
      maxAmount: 0,
      maxSlippage: 0,
    },
  ],
  riskSettings: {
    maxTransactionValue: 1000,
    volatilityThreshold: 25,
    autoRevokeOnHighVolatility: true,
    communityVoteRequired: true,
  },
  conditions: [
    {
      id: '1',
      type: 'max_amount',
      label: 'Maximum Transaction Amount',
      value: 1000,
      unit: 'USD',
    },
    {
      id: '2',
      type: 'volatility_threshold',
      label: 'Volatility Threshold',
      value: 25,
      unit: '%',
    },
    {
      id: '3',
      type: 'time_limit',
      label: 'Delegation Duration',
      value: 7,
      unit: 'days',
    },
  ],
};

const permissionIcons = {
  swap: BarChart3,
  add_liquidity: DollarSign,
  remove_liquidity: DollarSign,
  stake: Shield,
  unstake: Shield,
  transfer: Zap,
};

export function DelegationManager() {
  const [delegation, setDelegation] = useState(delegationData);
  const [isEditing, setIsEditing] = useState(false);

  const togglePermission = (permissionId: string) => {
    setDelegation(prev => ({
      ...prev,
      permissions: prev.permissions.map(p => 
        p.id === permissionId 
          ? { ...p, isGranted: !p.isGranted }
          : p
      ),
    }));
  };

  const updateRiskSetting = (key: string, value: any) => {
    setDelegation(prev => ({
      ...prev,
      riskSettings: {
        ...prev.riskSettings,
        [key]: value,
      },
    }));
  };

  const saveChanges = () => {
    // In production, this would save to the backend
    setIsEditing(false);
  };

  return (
    <div className="space-y-6">
      {/* Delegation Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Delegation Status
              </CardTitle>
              <CardDescription>
                Manage your AI agent permissions and risk settings
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={delegation.isActive ? "default" : "secondary"}>
                {delegation.isActive ? 'Active' : 'Inactive'}
              </Badge>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setIsEditing(!isEditing)}
              >
                <Settings className="w-4 h-4 mr-1" />
                {isEditing ? 'Cancel' : 'Edit'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Delegate Address */}
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div>
                <div className="font-medium">Delegate Address</div>
                <div className="text-sm text-muted-foreground font-mono">
                  {delegation.delegateAddress.slice(0, 10)}...{delegation.delegateAddress.slice(-8)}
                </div>
              </div>
              <Badge variant="outline">Agent Zule</Badge>
            </div>

            {/* Risk Alert */}
            {delegation.riskSettings.autoRevokeOnHighVolatility && (
              <div className="flex items-center gap-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-yellow-500" />
                <div className="text-sm">
                  <span className="font-medium">Auto-revoke enabled:</span> Delegation will be automatically revoked if volatility exceeds {delegation.riskSettings.volatilityThreshold}%
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Permissions */}
      <Card>
        <CardHeader>
          <CardTitle>Permissions</CardTitle>
          <CardDescription>
            Configure what actions the AI agent can perform
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {delegation.permissions.map((permission) => {
              const Icon = permissionIcons[permission.type as keyof typeof permissionIcons];
              
              return (
                <div key={permission.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <div className="font-medium">{permission.label}</div>
                      <div className="text-sm text-muted-foreground">
                        {permission.isGranted ? 'Enabled' : 'Disabled'}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    {permission.isGranted && (
                      <div className="text-right text-sm">
                        <div>Max: ${permission.maxAmount}</div>
                        <div>Slippage: {permission.maxSlippage}%</div>
                      </div>
                    )}
                    
                    {isEditing ? (
                      <Switch
                        checked={permission.isGranted}
                        onCheckedChange={() => togglePermission(permission.id)}
                      />
                    ) : (
                      <div className="flex items-center gap-1">
                        {permission.isGranted ? (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        ) : (
                          <div className="w-4 h-4 rounded-full border-2 border-muted-foreground" />
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Risk Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Risk Settings</CardTitle>
          <CardDescription>
            Configure risk management and safety parameters
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Max Transaction Value */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="font-medium">Maximum Transaction Value</label>
                <span className="text-sm text-muted-foreground">
                  ${delegation.riskSettings.maxTransactionValue}
                </span>
              </div>
              {isEditing && (
                <Slider
                  value={[delegation.riskSettings.maxTransactionValue]}
                  onValueChange={(value) => updateRiskSetting('maxTransactionValue', value[0])}
                  max={5000}
                  min={100}
                  step={100}
                  className="w-full"
                />
              )}
            </div>

            {/* Volatility Threshold */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="font-medium">Volatility Threshold</label>
                <span className="text-sm text-muted-foreground">
                  {delegation.riskSettings.volatilityThreshold}%
                </span>
              </div>
              {isEditing && (
                <Slider
                  value={[delegation.riskSettings.volatilityThreshold]}
                  onValueChange={(value) => updateRiskSetting('volatilityThreshold', value[0])}
                  max={100}
                  min={5}
                  step={5}
                  className="w-full"
                />
              )}
            </div>

            {/* Auto-revoke Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Auto-revoke on High Volatility</div>
                <div className="text-sm text-muted-foreground">
                  Automatically revoke delegation when volatility exceeds threshold
                </div>
              </div>
              {isEditing ? (
                <Switch
                  checked={delegation.riskSettings.autoRevokeOnHighVolatility}
                  onCheckedChange={(checked) => updateRiskSetting('autoRevokeOnHighVolatility', checked)}
                />
              ) : (
                <Badge variant={delegation.riskSettings.autoRevokeOnHighVolatility ? "default" : "secondary"}>
                  {delegation.riskSettings.autoRevokeOnHighVolatility ? 'Enabled' : 'Disabled'}
                </Badge>
              )}
            </div>

            {/* Community Vote Required */}
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Community Vote Required</div>
                <div className="text-sm text-muted-foreground">
                  High-risk transactions require community approval
                </div>
              </div>
              {isEditing ? (
                <Switch
                  checked={delegation.riskSettings.communityVoteRequired}
                  onCheckedChange={(checked) => updateRiskSetting('communityVoteRequired', checked)}
                />
              ) : (
                <Badge variant={delegation.riskSettings.communityVoteRequired ? "default" : "secondary"}>
                  {delegation.riskSettings.communityVoteRequired ? 'Required' : 'Optional'}
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Changes */}
      {isEditing && (
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setIsEditing(false)}>
            Cancel
          </Button>
          <Button onClick={saveChanges}>
            Save Changes
          </Button>
        </div>
      )}
    </div>
  );
}
