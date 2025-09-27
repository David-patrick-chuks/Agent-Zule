'use client';

import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface PortfolioChartProps {
  data: any[];
  timeframe?: string;
  showArea?: boolean;
  height?: number;
  className?: string;
}

export function PortfolioChart({ 
  data, 
  timeframe = '7d', 
  showArea = true, 
  height = 300,
  className 
}: PortfolioChartProps) {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    return data.map((item, index) => ({
      ...item,
      timestamp: new Date(item.timestamp).toLocaleDateString(),
      value: parseFloat(item.value) || 0,
      change: parseFloat(item.change) || 0,
      changePercent: parseFloat(item.changePercent) || 0,
    }));
  }, [data]);

  const totalValue = useMemo(() => {
    if (chartData.length === 0) return 0;
    return chartData[chartData.length - 1]?.value || 0;
  }, [chartData]);

  const totalChange = useMemo(() => {
    if (chartData.length < 2) return 0;
    const first = chartData[0]?.value || 0;
    const last = chartData[chartData.length - 1]?.value || 0;
    return last - first;
  }, [chartData]);

  const totalChangePercent = useMemo(() => {
    if (chartData.length < 2) return 0;
    const first = chartData[0]?.value || 0;
    const last = chartData[chartData.length - 1]?.value || 0;
    return first > 0 ? ((last - first) / first) * 100 : 0;
  }, [chartData]);

  const isPositive = totalChange >= 0;
  const TrendIcon = isPositive ? TrendingUp : TrendingDown;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-lg font-semibold">
            ${data.value?.toLocaleString() || '0'}
          </p>
          <div className="flex items-center gap-1 text-sm">
            <TrendIcon className={`w-3 h-3 ${isPositive ? 'text-green-500' : 'text-red-500'}`} />
            <span className={isPositive ? 'text-green-500' : 'text-red-500'}>
              {isPositive ? '+' : ''}{data.changePercent?.toFixed(2) || '0'}%
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  if (chartData.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Portfolio Performance</CardTitle>
          <CardDescription>No data available for the selected timeframe</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            No portfolio data available
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Portfolio Performance</CardTitle>
            <CardDescription>
              {timeframe} performance overview
            </CardDescription>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">
              ${totalValue.toLocaleString()}
            </div>
            <div className="flex items-center gap-1">
              <TrendIcon className={`w-4 h-4 ${isPositive ? 'text-green-500' : 'text-red-500'}`} />
              <span className={`text-sm font-medium ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
                {isPositive ? '+' : ''}{totalChangePercent.toFixed(2)}%
              </span>
              <Badge variant="outline" className="ml-2">
                {timeframe}
              </Badge>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div style={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
            {showArea ? (
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="portfolioGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis 
                  dataKey="timestamp" 
                  tick={{ fontSize: 12 }}
                  tickLine={{ stroke: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  tickLine={{ stroke: 'hsl(var(--muted-foreground))' }}
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  fill="url(#portfolioGradient)"
                />
              </AreaChart>
            ) : (
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis 
                  dataKey="timestamp" 
                  tick={{ fontSize: 12 }}
                  tickLine={{ stroke: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  tickLine={{ stroke: 'hsl(var(--muted-foreground))' }}
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, stroke: 'hsl(var(--primary))', strokeWidth: 2 }}
                />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
