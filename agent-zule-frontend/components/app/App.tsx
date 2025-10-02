'use client';

import { Dashboard } from '@/components/dashboard/Dashboard';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Web3State } from '@/lib/types';
import { apiClient } from '@/services/api/apiClient';
import { walletService } from '@/services/web3/walletService';
import {
    Activity,
    AlertTriangle,
    Bot,
    CheckCircle,
    Loader2,
    Shield,
    Wallet
} from 'lucide-react';
import { useEffect, useState } from 'react';

export function App() {
  const [walletState, setWalletState] = useState<Web3State>({
    isConnected: false,
    isConnecting: false,
  });
  const [isInitialized, setIsInitialized] = useState(false);
  const [healthStatus, setHealthStatus] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      setError(null);
      
      // Initialize API client
      await apiClient.initialize();
      
      // Get initial wallet state
      const initialWalletState = await walletService.getWalletState();
      setWalletState(initialWalletState);
      
      // Check system health
      const health = await apiClient.healthCheck();
      setHealthStatus(health);
      
      setIsInitialized(true);
    } catch (err) {
      console.error('Failed to initialize app:', err);
      setError('Failed to initialize application. Please refresh the page.');
    }
  };

  const handleConnectWallet = async () => {
    setWalletState(prev => ({ ...prev, isConnecting: true }));
    setError(null);

    try {
      const newWalletState = await apiClient.connectWallet();
      setWalletState(newWalletState);
      
      if (newWalletState.isConnected) {
        // Refresh health status after wallet connection
        const health = await apiClient.healthCheck();
        setHealthStatus(health);
      }
    } catch (err) {
      console.error('Failed to connect wallet:', err);
      setError('Failed to connect wallet. Please try again.');
    } finally {
      setWalletState(prev => ({ ...prev, isConnecting: false }));
    }
  };

  const handleDisconnectWallet = async () => {
    try {
      const newWalletState = await walletService.disconnectWallet();
      setWalletState(newWalletState);
    } catch (err) {
      console.error('Failed to disconnect wallet:', err);
      setError('Failed to disconnect wallet. Please try again.');
    }
  };

  const getHealthStatusColor = (status: boolean) => {
    return status ? 'text-green-600' : 'text-red-600';
  };

  const getHealthStatusIcon = (status: boolean) => {
    return status ? (
      <CheckCircle className="w-4 h-4 text-green-600" />
    ) : (
      <AlertTriangle className="w-4 h-4 text-red-600" />
    );
  };

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Bot className="w-12 h-12 text-primary" />
            </div>
            <CardTitle className="text-2xl">Agent Zule</CardTitle>
            <CardDescription>
              AI-Powered Portfolio Rebalancing Agent
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-center space-x-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Initializing...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 sm:space-x-4">
              <Bot className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
              <div>
                <h1 className="text-lg sm:text-xl font-bold">Agent Zule</h1>
                <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">AI Portfolio Platform</p>
              </div>
            </div>

            <div className="flex items-center space-x-2 sm:space-x-4">
              {/* Health Status - Hidden on mobile, shown on tablet+ */}
              {healthStatus && (
                <div className="hidden lg:flex items-center space-x-2">
                  <div className="flex items-center space-x-1">
                    {getHealthStatusIcon(healthStatus.api)}
                    <span className="text-xs">API</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    {getHealthStatusIcon(healthStatus.websocket)}
                    <span className="text-xs">WS</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    {getHealthStatusIcon(healthStatus.contracts)}
                    <span className="text-xs">Contracts</span>
                  </div>
                </div>
              )}

              {/* Wallet Connection */}
              {walletState.isConnected ? (
                <div className="flex items-center space-x-1 sm:space-x-2">
                  <Badge variant="default" className="flex items-center space-x-1 text-xs">
                    <Wallet className="w-3 h-3" />
                    <span className="hidden sm:inline">
                      {walletState.account?.slice(0, 4)}...{walletState.account?.slice(-4)}
                    </span>
                    <span className="sm:hidden">
                      {walletState.account?.slice(0, 2)}...{walletState.account?.slice(-2)}
                    </span>
                  </Badge>
                  <Button variant="outline" size="sm" onClick={handleDisconnectWallet} className="text-xs px-2 sm:px-3">
                    <span className="hidden sm:inline">Disconnect</span>
                    <span className="sm:hidden">×</span>
                  </Button>
                </div>
              ) : (
                <Button 
                  onClick={handleConnectWallet} 
                  disabled={walletState.isConnecting}
                  className="flex items-center space-x-1 sm:space-x-2 text-xs sm:text-sm px-2 sm:px-4"
                >
                  {walletState.isConnecting ? (
                    <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" />
                  ) : (
                    <Wallet className="w-3 h-3 sm:w-4 sm:h-4" />
                  )}
                  <span className="hidden sm:inline">Connect Wallet</span>
                  <span className="sm:hidden">Connect</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-4 sm:py-8">
        {error && (
          <Alert className="mb-6" variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!walletState.isConnected ? (
          <div className="max-w-2xl mx-auto">
            <Card>
              <CardHeader className="text-center px-4 sm:px-6">
                <div className="flex justify-center mb-4">
                  <Bot className="w-12 h-12 sm:w-16 sm:h-16 text-primary" />
                </div>
                <CardTitle className="text-2xl sm:text-3xl">Welcome to Agent Zule</CardTitle>
                <CardDescription className="text-base sm:text-lg">
                  AI-powered portfolio rebalancing and management platform
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 px-4 sm:px-6">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="text-center space-y-2">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto">
                      <Bot className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                    </div>
                    <h3 className="font-semibold text-sm sm:text-base">AI-Powered</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Continuous portfolio optimization using advanced AI algorithms
                    </p>
                  </div>
                  <div className="text-center space-y-2">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-500/10 rounded-lg flex items-center justify-center mx-auto">
                      <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-green-500" />
                    </div>
                    <h3 className="font-semibold text-sm sm:text-base">Secure Delegations</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Conditional permissions that adapt to market conditions
                    </p>
                  </div>
                  <div className="text-center space-y-2 sm:col-span-2 lg:col-span-1">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-500/10 rounded-lg flex items-center justify-center mx-auto">
                      <Activity className="w-5 h-5 sm:w-6 sm:h-6 text-blue-500" />
                    </div>
                    <h3 className="font-semibold text-sm sm:text-base">Real-time Updates</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Live portfolio monitoring and instant notifications
                    </p>
                  </div>
                </div>

                <div className="text-center space-y-4">
                  <p className="text-sm sm:text-base text-muted-foreground">
                    Connect your wallet to start optimizing your portfolio with AI
                  </p>
                  <Button 
                    size="lg" 
                    onClick={handleConnectWallet}
                    disabled={walletState.isConnecting}
                    className="flex items-center space-x-2 w-full sm:w-auto"
                  >
                    {walletState.isConnecting ? (
                      <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                    ) : (
                      <Wallet className="w-4 h-4 sm:w-5 sm:h-5" />
                    )}
                    <span>Connect Wallet</span>
                  </Button>
                </div>

                {/* System Status */}
                {healthStatus && (
                  <div className="border-t pt-6">
                    <h4 className="font-semibold mb-3 text-center text-sm sm:text-base">System Status</h4>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                      <div className="text-center">
                        <div className={`flex items-center justify-center space-x-1 ${getHealthStatusColor(healthStatus.api)}`}>
                          {getHealthStatusIcon(healthStatus.api)}
                          <span className="text-xs sm:text-sm">Backend API</span>
                        </div>
                      </div>
                      <div className="text-center">
                        <div className={`flex items-center justify-center space-x-1 ${getHealthStatusColor(healthStatus.websocket)}`}>
                          {getHealthStatusIcon(healthStatus.websocket)}
                          <span className="text-xs sm:text-sm">WebSocket</span>
                        </div>
                      </div>
                      <div className="text-center">
                        <div className={`flex items-center justify-center space-x-1 ${getHealthStatusColor(healthStatus.contracts)}`}>
                          {getHealthStatusIcon(healthStatus.contracts)}
                          <span className="text-xs sm:text-sm">Smart Contracts</span>
                        </div>
                      </div>
                      <div className="text-center">
                        <div className={`flex items-center justify-center space-x-1 ${getHealthStatusColor(healthStatus.wallet)}`}>
                          {getHealthStatusIcon(healthStatus.wallet)}
                          <span className="text-xs sm:text-sm">Wallet</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          <Dashboard walletState={walletState} />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t mt-8 sm:mt-16">
        <div className="container mx-auto px-4 py-6 sm:py-8">
          <div className="text-center text-xs sm:text-sm text-muted-foreground">
            <p>Agent Zule - AI-Powered Portfolio Management Platform</p>
            <p className="mt-2 hidden sm:block">
              Advanced portfolio optimization powered by AI and blockchain technology
            </p>
            <p className="mt-2 sm:hidden">
              AI-powered portfolio optimization
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
