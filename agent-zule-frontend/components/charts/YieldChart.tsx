'use client';

import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, DollarSign, Percent } from 'lucide-react';

interface YieldChartProps {
  data: Array<{
    name: string;
    yield: number;
    apy: number;
    tvl: number;
    risk: 'low' | 'medium' | 'high';
    protocol: string;
  }>;
  chartType?: 'bar' | 'line' | 'pie';
  height?: number;
  className?: string;
}

const COLORS = {
  low: '#22c55e',
  medium: '#f59e0b',
  high: '#ef4444',
};

export function YieldChart({ 
  data, 
  chartType = 'bar',
  height = 300,
  className 
}: YieldChartProps) {
  const chartData = useMemo(() => {
    return data.map(item => ({
      ...item,
      yieldPercent: item.yield,
      apyPercent: item.apy,
      tvlFormatted: item.tvl / 1000000, // Convert to millions
    }));
  }, [data]);

  const pieData = useMemo(() => {
    const riskGroups = data.reduce((acc, item) => {
      acc[item.risk] = (acc[item.risk] || 0) + item.tvl;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(riskGroups).map(([risk, tvl]) => ({
      name: risk.charAt(0).toUpperCase() + risk.slice(1),
      value: tvl,
      color: COLORS[risk as keyof typeof COLORS],
    }));
  }, [data]);

  const totalTVL = useMemo(() => {
    return data.reduce((sum, item) => sum + item.tvl, 0);
  }, [data]);

  const averageYield = useMemo(() => {
    return data.reduce((sum, item) => sum + item.yield, 0) / data.length;
  }, [data]);

  const bestYield = useMemo(() => {
    return Math.max(...data.map(item => item.yield));
  }, [data]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium">{data.name}</p>
          <p className="text-sm text-muted-foreground">{data.protocol}</p>
          <div className="space-y-1 mt-2">
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm">Yield:</span>
              <span className="text-sm font-semibold text-green-500">
                {data.yieldPercent.toFixed(2)}%
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm">APY:</span>
              <span className="text-sm font-semibold">
                {data.apyPercent.toFixed(2)}%
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm">TVL:</span>
              <span className="text-sm font-semibold">
                ${data.tvlFormatted.toFixed(1)}M
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm">Risk:</span>
              <Badge 
                variant="outline" 
                className={`text-xs ${
                  data.risk === 'low' ? 'text-green-500 border-green-500' :
                  data.risk === 'medium' ? 'text-yellow-500 border-yellow-500' :
                  'text-red-500 border-red-500'
                }`}
              >
                {data.risk.charAt(0).toUpperCase() + data.risk.slice(1)}
              </Badge>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  const renderChart = () => {
    switch (chartType) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => `${value}%`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar 
                dataKey="yieldPercent" 
                fill="hsl(var(--primary))"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        );
      
      case 'line':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => `${value}%`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="yieldPercent"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: 'hsl(var(--primary))', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        );
      
      case 'pie':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => [`$${(value / 1000000).toFixed(1)}M`, 'TVL']} />
            </PieChart>
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
              <TrendingUp className="w-5 h-5" />
              Yield Opportunities
            </CardTitle>
            <CardDescription>
              Available yield farming opportunities
            </CardDescription>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-green-500">
              {bestYield.toFixed(2)}%
            </div>
            <div className="text-sm text-muted-foreground">
              Best Yield
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div style={{ height }}>
          {renderChart()}
        </div>
        
        {/* Yield Summary */}
        <div className="mt-4 grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-500">
              {averageYield.toFixed(2)}%
            </div>
            <div className="text-sm text-muted-foreground">
              Average Yield
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">
              ${(totalTVL / 1000000).toFixed(1)}M
            </div>
            <div className="text-sm text-muted-foreground">
              Total TVL
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">
              {data.length}
            </div>
            <div className="text-sm text-muted-foreground">
              Opportunities
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
