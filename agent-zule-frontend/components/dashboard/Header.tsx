'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Bell, 
  Settings, 
  User, 
  Wallet,
  Activity,
  TrendingUp,
  AlertTriangle
} from 'lucide-react';

export function Header() {
  const [notifications] = useState([
    { id: 1, type: 'recommendation', message: 'New AI recommendation available', time: '2m ago' },
    { id: 2, type: 'risk', message: 'High volatility detected', time: '5m ago' },
    { id: 3, type: 'community', message: 'Community vote completed', time: '1h ago' },
  ]);

  return (
    <header className="bg-card border-b border-border px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Left side - Status indicators */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-sm font-medium">AI Agent Active</span>
          </div>
          
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-green-500" />
            <span className="text-sm text-green-500 font-medium">+2.05%</span>
          </div>
          
          <Badge variant="outline" className="text-xs">
            Monad Testnet
          </Badge>
        </div>

        {/* Right side - Actions and user */}
        <div className="flex items-center gap-4">
          {/* Notifications */}
          <div className="relative">
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="w-5 h-5" />
              {notifications.length > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-1 -right-1 w-5 h-5 p-0 flex items-center justify-center text-xs"
                >
                  {notifications.length}
                </Badge>
              )}
            </Button>
          </div>

          {/* Wallet Status */}
          <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg">
            <Wallet className="w-4 h-4 text-green-500" />
            <span className="text-sm font-medium">Connected</span>
            <Badge variant="secondary" className="text-xs">
              0x1234...5678
            </Badge>
          </div>

          {/* Settings */}
          <Button variant="ghost" size="icon">
            <Settings className="w-5 h-5" />
          </Button>

          {/* User */}
          <Button variant="ghost" size="icon">
            <User className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Alert banner for high volatility */}
      <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-3">
        <AlertTriangle className="w-5 h-5 text-destructive" />
        <div className="flex-1">
          <p className="text-sm font-medium text-destructive">
            High Volatility Alert
          </p>
          <p className="text-xs text-muted-foreground">
            Market volatility has exceeded your threshold. Delegation auto-revoked for safety.
          </p>
        </div>
        <Button variant="outline" size="sm">
          Review Settings
        </Button>
      </div>
    </header>
  );
}
