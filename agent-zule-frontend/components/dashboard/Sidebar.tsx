'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Bot, 
  TrendingUp, 
  Shield, 
  Users, 
  Settings, 
  BarChart3,
  Wallet,
  Activity
} from 'lucide-react';

const navigation = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: BarChart3,
    current: true,
  },
  {
    name: 'Portfolio',
    href: '/dashboard/portfolio',
    icon: TrendingUp,
    current: false,
  },
  {
    name: 'AI Recommendations',
    href: '/dashboard/recommendations',
    icon: Bot,
    current: false,
    badge: '3',
  },
  {
    name: 'Risk Assessment',
    href: '/dashboard/risk',
    icon: Shield,
    current: false,
  },
  {
    name: 'Community',
    href: '/dashboard/community',
    icon: Users,
    current: false,
  },
  {
    name: 'Delegations',
    href: '/dashboard/delegations',
    icon: Wallet,
    current: false,
  },
  {
    name: 'Activity',
    href: '/dashboard/activity',
    icon: Activity,
    current: false,
  },
  {
    name: 'Settings',
    href: '/dashboard/settings',
    icon: Settings,
    current: false,
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className={cn(
      "flex flex-col bg-card border-r border-border transition-all duration-300",
      isCollapsed ? "w-16" : "w-64"
    )}>
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
            <Bot className="w-5 h-5 text-primary" />
          </div>
          {!isCollapsed && (
            <div>
              <h2 className="font-bold text-lg">Agent Zule</h2>
              <p className="text-xs text-muted-foreground">AI Portfolio Agent</p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link key={item.name} href={item.href}>
              <Button
                variant={isActive ? "default" : "ghost"}
                className={cn(
                  "w-full justify-start gap-3",
                  isActive && "bg-primary text-primary-foreground"
                )}
              >
                <item.icon className="w-4 h-4" />
                {!isCollapsed && (
                  <>
                    <span className="flex-1 text-left">{item.name}</span>
                    {item.badge && (
                      <Badge variant="secondary" className="ml-auto">
                        {item.badge}
                      </Badge>
                    )}
                  </>
                )}
              </Button>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-accent/10 rounded-full flex items-center justify-center">
            <div className="w-2 h-2 bg-accent rounded-full animate-pulse" />
          </div>
          {!isCollapsed && (
            <div className="flex-1">
              <p className="text-sm font-medium">AI Agent Active</p>
              <p className="text-xs text-muted-foreground">
                Monitoring market conditions
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
