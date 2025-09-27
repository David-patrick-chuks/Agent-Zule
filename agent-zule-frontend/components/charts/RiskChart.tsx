'use client';

import { useMemo } from 'react';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, AlertTriangle, TrendingUp } from 'lucide-react';

interface RiskChartProps {
  data: {
    volatility: number;
    sharpeRatio: number;
    maxDrawdown: number;
    beta: number;
    var: number;
  };
  history?: Array<{
    timestamp: string;
    volatility: number;
    sharpeRatio: number;
    maxDrawdown: number;
  }>;
  chartType?: 'radar' | 'bar' | 'line';
  height?: number;
  className?: string;
}

export function RiskChart({ 
  data, 
  history = [], 
  chartType = 'radar',
  height = 300,
  className 
}: RiskChartProps) {
  const radarData = useMemo(() => [
    {
      metric: 'Volatility',
      value: data.volatility,
      fullMark: 100,
    },
    {
      metric: 'Sharpe Ratio',
      value: data.sharpeRatio * 20, // Scale for radar chart
      fullMark: 100,
    },
    {
      metric: 'Max Drawdown',
      value: data.maxDrawdown * 100,
      fullMark: 100,
    },
    {
      metric: 'Beta',
      value: data.beta * 100,
      fullMark: 100,
    },
    {
      metric: 'VaR',
      value: data.var * 100,
      fullMark: 100,
    },
  ], [data]);

  const barData = useMemo(() => [
    {
      name: 'Volatility',
      value: data.volatility,
      threshold: 25,
      color: data.volatility > 25 ? '#ef4444' : data.volatility > 15 ? '#f59e0b' : '#22c55e',
    },
    {
      name: 'Sharpe Ratio',
      value: data.sharpeRatio,
      threshold: 1.5,
      color: data.sharpeRatio > 1.5 ? '#22c55e' : data.sharpeRatio > 1.0 ? '#f59e0b' : '#ef4444',
    },
    {
      name: 'Max Drawdown',
      value: data.maxDrawdown * 100,
      threshold: 10,
      color: data.maxDrawdown > 0.1 ? '#ef4444' : data.maxDrawdown > 0.05 ? '#f59e0b' : '#22c55e',
    },
    {
      name: 'Beta',
      value: data.beta,
      threshold: 1.0,
      color: data.beta > 1.0 ? '#ef4444' : data.beta > 0.7 ? '#f59e0b' : '#22c55e',
    },
  ], [data]);

  const historyData = useMemo(() => {
    return history.map(item => ({
      ...item,
      timestamp: new Date(item.timestamp).toLocaleDateString(),
      volatility: item.volatility,
      sharpeRatio: item.sharpeRatio,
      maxDrawdown: item.maxDrawdown * 100,
    }));
  }, [history]);

  const riskLevel = useMemo(() => {
    const score = (data.volatility + (1 - data.sharpeRatio) * 50 + data.maxDrawdown * 100) / 3;
    if (score < 20) return { level: 'Low', color: 'text-green-500', bgColor: 'bg-green-500/10' };
    if (score < 40) return { level: 'Medium', color: 'text-yellow-500', bgColor: 'bg-yellow-500/10' };
    return { level: 'High', color: 'text-red-500', bgColor: 'bg-red-500/10' };
  }, [data]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-lg font-semibold">
            {data.value?.toFixed(2) || '0'}
          </p>
          <div className="flex items-center gap-1 text-sm">
            <div 
              className="w-2 h-2 rounded-full" 
              style={{ backgroundColor: data.color }}
            />
            <span className="text-muted-foreground">
              Threshold: {data.threshold}
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  const renderChart = () => {
    switch (chartType) {
      case 'radar':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="metric" />
              <PolarRadiusAxis angle={90} domain={[0, 100]} />
              <Radar
                name="Risk Metrics"
                dataKey="value"
                stroke="hsl(var(--primary))"
                fill="hsl(var(--primary))"
                fillOpacity={0.3}
                strokeWidth={2}
              />
            </RadarChart>
          </ResponsiveContainer>
        );
      
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" fill="hsl(var(--primary))" />
            </BarChart>
          </ResponsiveContainer>
        );
      
      case 'line':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" fill="hsl(var(--primary))" />
            </BarChart>
          </ResponsiveContainer>
        );
      
      default:
        return null;
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Risk Assessment
            </CardTitle>
            <CardDescription>
              Portfolio risk metrics and analysis
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={`${riskLevel.bgColor} ${riskLevel.color} border-0`}>
              {riskLevel.level} Risk
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div style={{ height }}>
          {renderChart()}
        </div>
        
        {/* Risk Summary */}
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Volatility</span>
              <span className="text-sm font-medium">
                {data.volatility.toFixed(1)}%
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Sharpe Ratio</span>
              <span className="text-sm font-medium">
                {data.sharpeRatio.toFixed(2)}
              </span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Max Drawdown</span>
              <span className="text-sm font-medium">
                {(data.maxDrawdown * 100).toFixed(1)}%
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Beta</span>
              <span className="text-sm font-medium">
                {data.beta.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
