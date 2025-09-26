'use client';

import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Area, AreaChart } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, Users, TrendingUp, MessageCircle } from 'lucide-react';

interface ActivityChartProps {
  data: Array<{
    timestamp: string;
    transactions: number;
    users: number;
    volume: number;
    votes: number;
    recommendations: number;
  }>;
  chartType?: 'line' | 'bar' | 'area';
  metric?: 'transactions' | 'users' | 'volume' | 'votes' | 'recommendations';
  height?: number;
  className?: string;
}

export function ActivityChart({ 
  data, 
  chartType = 'line',
  metric = 'transactions',
  height = 300,
  className 
}: ActivityChartProps) {
  const chartData = useMemo(() => {
    return data.map(item => ({
      ...item,
      date: new Date(item.timestamp).toLocaleDateString(),
      volumeFormatted: item.volume / 1000000, // Convert to millions
    }));
  }, [data]);

  const totalTransactions = useMemo(() => {
    return data.reduce((sum, item) => sum + item.transactions, 0);
  }, [data]);

  const totalUsers = useMemo(() => {
    return Math.max(...data.map(item => item.users));
  }, [data]);

  const totalVolume = useMemo(() => {
    return data.reduce((sum, item) => sum + item.volume, 0);
  }, [data]);

  const totalVotes = useMemo(() => {
    return data.reduce((sum, item) => sum + item.votes, 0);
  }, [data]);

  const totalRecommendations = useMemo(() => {
    return data.reduce((sum, item) => sum + item.recommendations, 0);
  }, [data]);

  const metricConfig = {
    transactions: {
      label: 'Transactions',
      icon: Activity,
      color: 'hsl(var(--primary))',
      format: (value: number) => value.toLocaleString(),
    },
    users: {
      label: 'Active Users',
      icon: Users,
      color: 'hsl(var(--accent))',
      format: (value: number) => value.toLocaleString(),
    },
    volume: {
      label: 'Volume',
      icon: TrendingUp,
      color: 'hsl(var(--green-500))',
      format: (value: number) => `$${(value / 1000000).toFixed(1)}M`,
    },
    votes: {
      label: 'Community Votes',
      icon: MessageCircle,
      color: 'hsl(var(--blue-500))',
      format: (value: number) => value.toLocaleString(),
    },
    recommendations: {
      label: 'AI Recommendations',
      icon: Activity,
      color: 'hsl(var(--purple-500))',
      format: (value: number) => value.toLocaleString(),
    },
  };

  const currentMetric = metricConfig[metric];
  const MetricIcon = currentMetric.icon;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
          <p className="text-sm text-muted-foreground">{label}</p>
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm">Transactions:</span>
              <span className="text-sm font-semibold">
                {data.transactions?.toLocaleString() || '0'}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm">Users:</span>
              <span className="text-sm font-semibold">
                {data.users?.toLocaleString() || '0'}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm">Volume:</span>
              <span className="text-sm font-semibold">
                ${(data.volume / 1000000).toFixed(1)}M
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm">Votes:</span>
              <span className="text-sm font-semibold">
                {data.votes?.toLocaleString() || '0'}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm">Recommendations:</span>
              <span className="text-sm font-semibold">
                {data.recommendations?.toLocaleString() || '0'}
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  const renderChart = () => {
    const commonProps = {
      data: chartData,
      children: (
        <>
          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
          <XAxis 
            dataKey="date" 
            tick={{ fontSize: 12 }}
            tickLine={{ stroke: 'hsl(var(--muted-foreground))' }}
          />
          <YAxis 
            tick={{ fontSize: 12 }}
            tickLine={{ stroke: 'hsl(var(--muted-foreground))' }}
            tickFormatter={(value) => currentMetric.format(value)}
          />
          <Tooltip content={<CustomTooltip />} />
        </>
      ),
    };

    switch (chartType) {
      case 'line':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart {...commonProps}>
              <Line
                type="monotone"
                dataKey={metric}
                stroke={currentMetric.color}
                strokeWidth={2}
                dot={{ fill: currentMetric.color, strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: currentMetric.color, strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        );
      
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart {...commonProps}>
              <Bar 
                dataKey={metric} 
                fill={currentMetric.color}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        );
      
      case 'area':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart {...commonProps}>
              <defs>
                <linearGradient id="activityGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={currentMetric.color} stopOpacity={0.3}/>
                  <stop offset="95%" stopColor={currentMetric.color} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey={metric}
                stroke={currentMetric.color}
                strokeWidth={2}
                fill="url(#activityGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        );
      
      default:
        return null;
    }
  };

  const getTotalForMetric = () => {
    switch (metric) {
      case 'transactions': return totalTransactions;
      case 'users': return totalUsers;
      case 'volume': return totalVolume;
      case 'votes': return totalVotes;
      case 'recommendations': return totalRecommendations;
      default: return 0;
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <MetricIcon className="w-5 h-5" />
              Community Activity
            </CardTitle>
            <CardDescription>
              {currentMetric.label} over time
            </CardDescription>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">
              {currentMetric.format(getTotalForMetric())}
            </div>
            <div className="text-sm text-muted-foreground">
              Total {currentMetric.label}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div style={{ height }}>
          {renderChart()}
        </div>
        
        {/* Activity Summary */}
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Transactions</span>
              <span className="text-sm font-medium">
                {totalTransactions.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Active Users</span>
              <span className="text-sm font-medium">
                {totalUsers.toLocaleString()}
              </span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total Volume</span>
              <span className="text-sm font-medium">
                ${(totalVolume / 1000000).toFixed(1)}M
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Community Votes</span>
              <span className="text-sm font-medium">
                {totalVotes.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
