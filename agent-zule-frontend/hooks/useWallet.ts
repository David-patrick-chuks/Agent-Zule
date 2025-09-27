'use client';

import { useState, useEffect, useCallback } from 'react';
import { Web3State } from '@/lib/types';
import { walletService } from '@/services/web3/walletService';

export function useWallet() {
  const [walletState, setWalletState] = useState<Web3State>({
    isConnected: false,
    isConnecting: false,
  });

  const connectWallet = useCallback(async () => {
    setWalletState(prev => ({ ...prev, isConnecting: true, error: undefined }));
    
    try {
      const state = await walletService.connectWallet();
      setWalletState(state);
    } catch (error) {
      setWalletState(prev => ({
        ...prev,
        isConnecting: false,
        error: error instanceof Error ? error.message : 'Failed to connect wallet',
      }));
    }
  }, []);

  const disconnectWallet = useCallback(async () => {
    try {
      const state = await walletService.disconnectWallet();
      setWalletState(state);
    } catch (error) {
      console.error('Disconnect error:', error);
    }
  }, []);

  const switchToMonadNetwork = useCallback(async () => {
    try {
      const success = await walletService.switchToMonadNetwork();
      if (success) {
        // Refresh wallet state after network switch
        const state = await walletService.getWalletState();
        setWalletState(state);
      }
      return success;
    } catch (error) {
      console.error('Network switch error:', error);
      return false;
    }
  }, []);

  const signMessage = useCallback(async (message: string) => {
    try {
      return await walletService.signMessage(message);
    } catch (error) {
      console.error('Sign message error:', error);
      throw error;
    }
  }, []);

  const sendTransaction = useCallback(async (transaction: any) => {
    try {
      return await walletService.sendTransaction(transaction);
    } catch (error) {
      console.error('Send transaction error:', error);
      throw error;
    }
  }, []);

  // Initialize wallet state on mount
  useEffect(() => {
    const initializeWallet = async () => {
      try {
        const state = await walletService.getWalletState();
        setWalletState(state);
      } catch (error) {
        console.error('Wallet initialization error:', error);
      }
    };

    initializeWallet();
  }, []);

  return {
    ...walletState,
    connectWallet,
    disconnectWallet,
    switchToMonadNetwork,
    signMessage,
    sendTransaction,
  };
}
