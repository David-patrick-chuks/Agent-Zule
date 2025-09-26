'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Shield, 
  AlertTriangle, 
  TrendingUp, 
  Activity,
  Zap,
  BarChart3
} from 'lucide-react';

// Mock data - in production this would come from API
const riskData = {
  overallRisk: 'low',
  volatility: 0.15,
  maxDrawdown: 0.05,
  sharpeRatio: 1.8,
  beta: 0.7,
  metrics: [
    {
      name: 'Volatility',
      value: 15,
      threshold: 25,
      status: 'safe',
      description: 'Market volatility within normal range',
    },
    {
      name: 'Drawdown',
      value: 5,
      threshold: 10,
      status: 'safe',
      description: 'Maximum drawdown below threshold',
    },
    {
      name: 'Sharpe Ratio',
      value: 1.8,
      threshold: 1.5,
      status: 'excellent',
      description: 'Risk-adjusted returns are excellent',
    },
    {
      name: 'Beta',
      value: 0.7,
      threshold: 1.0,
      status: 'safe',
      description: 'Lower volatility than market average',
    },
  ],
  alerts: [
    {
      id: '1',
      type: 'warning',
      title: 'High Volatility Detected',
      description: 'Market volatility has increased by 15% in the last hour',
      timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      action: 'Auto-revoked delegation for safety',
    },
    {
      id: '2',
      type: 'info',
      title: 'Portfolio Rebalancing',
      description: 'AI agent is rebalancing portfolio to maintain optimal risk levels',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      action: 'Automatic rebalancing in progress',
    },
  ],
};

const riskConfig = {
  low: { color: 'text-green-500', bgColor: 'bg-green-500/10', label: 'Low Risk' },
  medium: { color: 'text-yellow-500', bgColor: 'bg-yellow-500/10', label: 'Medium Risk' },
  high: { color: 'text-red-500', bgColor: 'bg-red-500/10', label: 'High Risk' },
};

const statusConfig = {
  safe: { color: 'text-green-500', label: 'Safe' },
  warning: { color: 'text-yellow-500', label: 'Warning' },
  excellent: { color: 'text-blue-500', label: 'Excellent' },
  danger: { color: 'text-red-500', label: 'Danger' },
};

const alertConfig = {
  warning: { icon: AlertTriangle, color: 'text-yellow-500', bgColor: 'bg-yellow-500/10' },
  info: { icon: Activity, color: 'text-blue-500', bgColor: 'bg-blue-500/10' },
  danger: { icon: Shield, color: 'text-red-500', bgColor: 'bg-red-500/10' },
};

export function RiskAssessment() {
  const riskInfo = riskConfig[riskData.overallRisk as keyof typeof riskConfig];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5" />
          Risk Assessment
        </CardTitle>
        <CardDescription>
          Real-time risk monitoring and portfolio protection
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Overall Risk Status */}
          <div className="text-center p-4 bg-muted/50 rounded-lg">
            <div className={`w-16 h-16 ${riskInfo.bgColor} rounded-full flex items-center justify-center mx-auto mb-3`}>
              <Shield className={`w-8 h-8 ${riskInfo.color}`} />
            </div>
            <div className={`text-2xl font-bold ${riskInfo.color} mb-2`}>
              {riskInfo.label}
            </div>
            <p className="text-sm text-muted-foreground">
              Portfolio is within safe risk parameters
            </p>
          </div>

          {/* Risk Metrics */}
          <div className="space-y-4">
            <h4 className="font-semibold">Risk Metrics</h4>
            {riskData.metrics.map((metric, index) => {
              const statusInfo = statusConfig[metric.status as keyof typeof statusConfig];
              const percentage = (metric.value / metric.threshold) * 100;
              const isOverThreshold = metric.value > metric.threshold;
              
              return (
                <div key={index} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{metric.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{metric.value}%</span>
                      <Badge 
                        variant="outline" 
                        className={statusInfo.color}
                      >
                        {statusInfo.label}
                      </Badge>
                    </div>
                  </div>
                  <Progress 
                    value={Math.min(percentage, 100)} 
                    className={`h-2 ${isOverThreshold ? 'bg-red-500' : ''}`}
                  />
                  <p className="text-xs text-muted-foreground">
                    {metric.description}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Risk Alerts */}
          <div className="space-y-3">
            <h4 className="font-semibold">Recent Alerts</h4>
            {riskData.alerts.map((alert) => {
              const alertInfo = alertConfig[alert.type as keyof typeof alertConfig];
              const AlertIcon = alertInfo.icon;
              
              return (
                <div key={alert.id} className={`p-3 rounded-lg border ${alertInfo.bgColor}`}>
                  <div className="flex items-start gap-3">
                    <AlertIcon className={`w-5 h-5 ${alertInfo.color} mt-0.5`} />
                    <div className="flex-1">
                      <div className="font-medium text-sm">{alert.title}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {alert.description}
                      </div>
                      <div className="text-xs text-muted-foreground mt-2">
                        {alert.action}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {Math.floor((Date.now() - new Date(alert.timestamp).getTime()) / (1000 * 60))}m ago
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Risk Controls */}
          <div className="pt-4 border-t">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold">Auto-Protection</h4>
                <p className="text-sm text-muted-foreground">
                  Delegation auto-revoke enabled
                </p>
              </div>
              <Badge variant="secondary" className="flex items-center gap-1">
                <Zap className="w-3 h-3" />
                Active
              </Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
