'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useRealTimePortfolio } from '@/hooks/useRealTimePortfolio';
import { useWallet } from '@/hooks/useWallet';
import { Activity, RefreshCw, TrendingDown, TrendingUp, Wifi, WifiOff } from 'lucide-react';

// Mock data - in production this would come from API
const portfolioData = {
  totalValue: 12500.50,
  totalValueChange: 250.75,
  totalValueChangePercent: 2.05,
  positions: [
    {
      id: '1',
      token: {
        symbol: 'MON',
        name: 'Monad',
        logoUrl: '/placeholder-logo.png',
        price: 0.15,
        priceChangePercent24h: 15.38,
      },
      amount: 50000,
      value: 7500,
      valueChange: 150,
      valueChangePercent: 2.04,
      allocation: 60,
    },
    {
      id: '2',
      token: {
        symbol: 'USDC',
        name: 'USD Coin',
        logoUrl: '/placeholder-logo.png',
        price: 1.00,
        priceChangePercent24h: 0,
      },
      amount: 5000,
      value: 5000,
      valueChange: 100.75,
      valueChangePercent: 2.05,
      allocation: 40,
    },
  ],
  lastUpdated: new Date().toISOString(),
};

export function PortfolioOverview() {
  const { address } = useWallet();
  const { 
    isConnected, 
    portfolioData: realTimeData, 
    requestPortfolioUpdate 
  } = useRealTimePortfolio(address);

  // Use real-time data if available, otherwise fall back to mock data
  const currentData = realTimeData || portfolioData;
  const isPositive = currentData.totalValueChangePercent >= 0;
  const TrendIcon = isPositive ? TrendingUp : TrendingDown;

  return (
    <div className="grid gap-6">
      {/* Portfolio Summary */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">Portfolio Overview</CardTitle>
              <CardDescription>
                AI-managed portfolio performance and allocation
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {isConnected ? (
                <Badge variant="secondary" className="text-green-600">
                  <Wifi className="w-3 h-3 mr-1" />
                  Live
                </Badge>
              ) : (
                <Badge variant="outline" className="text-gray-500">
                  <WifiOff className="w-3 h-3 mr-1" />
                  Offline
                </Badge>
              )}
              <Button variant="outline" size="sm" onClick={requestPortfolioUpdate}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-6">
            {/* Total Value */}
            <div className="text-center">
              <div className="text-3xl font-bold mb-2">
                ${currentData.totalValue?.toLocaleString() || '0'}
              </div>
              <div className="flex items-center justify-center gap-2">
                <TrendIcon className={`w-4 h-4 ${isPositive ? 'text-green-500' : 'text-red-500'}`} />
                <span className={`font-medium ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
                  {isPositive ? '+' : ''}{currentData.totalValueChangePercent || 0}%
                </span>
                <span className="text-muted-foreground text-sm">
                  (${currentData.totalValueChange?.toFixed(2) || '0.00'})
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-2">24h Performance</p>
            </div>

            {/* AI Status */}
            <div className="text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                <Activity className="w-6 h-6 text-primary" />
              </div>
              <div className="font-semibold mb-1">AI Agent Active</div>
              <div className="text-sm text-muted-foreground">
                Monitoring market conditions
              </div>
              <Badge variant="secondary" className="mt-2">
                Auto-rebalancing
              </Badge>
            </div>

            {/* Risk Level */}
            <div className="text-center">
              <div className="w-12 h-12 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-3">
                <div className="w-6 h-6 bg-green-500 rounded-full" />
              </div>
              <div className="font-semibold mb-1">Risk Level</div>
              <div className="text-sm text-muted-foreground">
                Low volatility detected
              </div>
              <Badge variant="outline" className="mt-2">
                Safe
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Holdings */}
      <Card>
        <CardHeader>
          <CardTitle>Holdings</CardTitle>
          <CardDescription>
            Current portfolio allocation and performance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {portfolioData.positions.map((position) => {
              const isPositionPositive = position.valueChangePercent >= 0;
              const PositionTrendIcon = isPositionPositive ? TrendingUp : TrendingDown;
              
              return (
                <div key={position.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
                      <span className="text-sm font-bold">
                        {position.token.symbol.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <div className="font-semibold">{position.token.symbol}</div>
                      <div className="text-sm text-muted-foreground">
                        {position.token.name}
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="font-semibold">
                      ${position.value.toLocaleString()}
                    </div>
                    <div className="flex items-center gap-1 text-sm">
                      <PositionTrendIcon className={`w-3 h-3 ${isPositionPositive ? 'text-green-500' : 'text-red-500'}`} />
                      <span className={isPositionPositive ? 'text-green-500' : 'text-red-500'}>
                        {isPositionPositive ? '+' : ''}{position.valueChangePercent}%
                      </span>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-sm text-muted-foreground">
                      {position.allocation}% allocation
                    </div>
                    <div className="text-sm">
                      {position.amount.toLocaleString()} {position.token.symbol}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
