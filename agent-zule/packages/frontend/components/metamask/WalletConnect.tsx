'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Wallet, 
  CheckCircle, 
  AlertTriangle, 
  ExternalLink,
  Copy,
  RefreshCw
} from 'lucide-react';

interface WalletState {
  isConnected: boolean;
  account?: string;
  chainId?: number;
  balance?: string;
  isConnecting: boolean;
  error?: string;
}

export function WalletConnect() {
  const [walletState, setWalletState] = useState<WalletState>({
    isConnected: false,
    isConnecting: false,
  });

  const connectWallet = async () => {
    setWalletState(prev => ({ ...prev, isConnecting: true, error: undefined }));
    
    try {
      // Mock connection - in production this would use MetaMask SDK
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setWalletState({
        isConnected: true,
        account: '0x1234567890abcdef1234567890abcdef12345678',
        chainId: 420, // Monad testnet
        balance: '1.25',
        isConnecting: false,
      });
    } catch (error) {
      setWalletState(prev => ({
        ...prev,
        isConnecting: false,
        error: 'Failed to connect wallet',
      }));
    }
  };

  const disconnectWallet = () => {
    setWalletState({
      isConnected: false,
      isConnecting: false,
    });
  };

  const copyAddress = () => {
    if (walletState.account) {
      navigator.clipboard.writeText(walletState.account);
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="w-5 h-5" />
          Wallet Connection
        </CardTitle>
        <CardDescription>
          Connect your MetaMask Smart Account to enable AI delegation
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!walletState.isConnected ? (
          <div className="space-y-4">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Wallet className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Connect Your Wallet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Connect your MetaMask Smart Account to start using Agent Zule
              </p>
            </div>
            
            <Button 
              onClick={connectWallet} 
              disabled={walletState.isConnecting}
              className="w-full"
              size="lg"
            >
              {walletState.isConnecting ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Wallet className="w-4 h-4 mr-2" />
                  Connect MetaMask
                </>
              )}
            </Button>
            
            {walletState.error && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-destructive" />
                <span className="text-sm text-destructive">{walletState.error}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Connection Status */}
            <div className="flex items-center justify-between p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="font-medium text-green-500">Connected</span>
              </div>
              <Badge variant="outline" className="text-green-500">
                Monad Testnet
              </Badge>
            </div>

            {/* Wallet Info */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Address</span>
                <div className="flex items-center gap-2">
                  <code className="text-sm bg-muted px-2 py-1 rounded">
                    {formatAddress(walletState.account!)}
                  </code>
                  <Button variant="ghost" size="sm" onClick={copyAddress}>
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Balance</span>
                <span className="text-sm font-mono">
                  {walletState.balance} MON
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Chain ID</span>
                <span className="text-sm font-mono">
                  {walletState.chainId}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1">
                <ExternalLink className="w-4 h-4 mr-1" />
                View on Explorer
              </Button>
              <Button variant="outline" size="sm" onClick={disconnectWallet}>
                Disconnect
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
