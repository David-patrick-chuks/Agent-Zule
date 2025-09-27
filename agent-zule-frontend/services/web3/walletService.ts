import { Web3State } from '@/lib/types';
import { METAMASK_CONFIG, MONAD_CONFIG } from '@/lib/constants';

class WalletService {
  private isConnected: boolean = false;
  private account: string | null = null;
  private chainId: number | null = null;
  private balance: string | null = null;

  constructor() {
    this.initializeWallet();
  }

  private async initializeWallet() {
    // Check if MetaMask is installed
    if (typeof window !== 'undefined' && window.ethereum) {
      try {
        // Check if already connected
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          this.account = accounts[0];
          this.isConnected = true;
          await this.updateChainId();
          await this.updateBalance();
        }
      } catch (error) {
        console.error('Wallet initialization error:', error);
      }
    }
  }

  async connectWallet(): Promise<Web3State> {
    try {
      if (typeof window === 'undefined' || !window.ethereum) {
        throw new Error('MetaMask is not installed');
      }

      // Request account access
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });

      if (accounts.length === 0) {
        throw new Error('No accounts found');
      }

      this.account = accounts[0];
      this.isConnected = true;

      // Get chain ID
      await this.updateChainId();

      // Get balance
      await this.updateBalance();

      // Set up event listeners
      this.setupEventListeners();

      return {
        isConnected: true,
        account: this.account,
        chainId: this.chainId,
        balance: this.balance,
        isConnecting: false,
      };
    } catch (error) {
      console.error('Wallet connection error:', error);
      return {
        isConnected: false,
        isConnecting: false,
        error: error instanceof Error ? error.message : 'Failed to connect wallet',
      };
    }
  }

  async disconnectWallet(): Promise<Web3State> {
    try {
      this.isConnected = false;
      this.account = null;
      this.chainId = null;
      this.balance = null;

      return {
        isConnected: false,
        isConnecting: false,
      };
    } catch (error) {
      console.error('Wallet disconnection error:', error);
      return {
        isConnected: false,
        isConnecting: false,
        error: 'Failed to disconnect wallet',
      };
    }
  }

  async switchToMonadNetwork(): Promise<boolean> {
    try {
      if (typeof window === 'undefined' || !window.ethereum) {
        throw new Error('MetaMask is not installed');
      }

      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${MONAD_CONFIG.chainId.toString(16)}` }],
      });

      return true;
    } catch (error: any) {
      // If the chain doesn't exist, add it
      if (error.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: `0x${MONAD_CONFIG.chainId.toString(16)}`,
                chainName: MONAD_CONFIG.chainName,
                rpcUrls: [MONAD_CONFIG.rpcUrl],
                nativeCurrency: MONAD_CONFIG.nativeCurrency,
                blockExplorerUrls: [MONAD_CONFIG.explorerUrl],
              },
            ],
          });
          return true;
        } catch (addError) {
          console.error('Failed to add Monad network:', addError);
          return false;
        }
      }
      console.error('Failed to switch to Monad network:', error);
      return false;
    }
  }

  async getWalletState(): Promise<Web3State> {
    return {
      isConnected: this.isConnected,
      account: this.account,
      chainId: this.chainId,
      balance: this.balance,
      isConnecting: false,
    };
  }

  private async updateChainId() {
    try {
      if (typeof window !== 'undefined' && window.ethereum) {
        const chainId = await window.ethereum.request({ method: 'eth_chainId' });
        this.chainId = parseInt(chainId, 16);
      }
    } catch (error) {
      console.error('Failed to get chain ID:', error);
    }
  }

  private async updateBalance() {
    try {
      if (this.account && typeof window !== 'undefined' && window.ethereum) {
        const balance = await window.ethereum.request({
          method: 'eth_getBalance',
          params: [this.account, 'latest'],
        });
        // Convert from wei to ETH
        this.balance = (parseInt(balance, 16) / Math.pow(10, 18)).toFixed(4);
      }
    } catch (error) {
      console.error('Failed to get balance:', error);
    }
  }

  private setupEventListeners() {
    if (typeof window !== 'undefined' && window.ethereum) {
      // Listen for account changes
      window.ethereum.on('accountsChanged', (accounts: string[]) => {
        if (accounts.length === 0) {
          this.disconnectWallet();
        } else {
          this.account = accounts[0];
          this.updateBalance();
        }
      });

      // Listen for chain changes
      window.ethereum.on('chainChanged', (chainId: string) => {
        this.chainId = parseInt(chainId, 16);
        this.updateBalance();
      });
    }
  }

  async signMessage(message: string): Promise<string> {
    try {
      if (!this.account) {
        throw new Error('No account connected');
      }

      const signature = await window.ethereum.request({
        method: 'personal_sign',
        params: [message, this.account],
      });

      return signature;
    } catch (error) {
      console.error('Message signing error:', error);
      throw new Error('Failed to sign message');
    }
  }

  async sendTransaction(transaction: any): Promise<string> {
    try {
      if (!this.account) {
        throw new Error('No account connected');
      }

      const txHash = await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [transaction],
      });

      return txHash;
    } catch (error) {
      console.error('Transaction error:', error);
      throw new Error('Failed to send transaction');
    }
  }
}

export const walletService = new WalletService();

// Extend Window interface for TypeScript
declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: any[] }) => Promise<any>;
      on: (event: string, callback: (...args: any[]) => void) => void;
      removeListener: (event: string, callback: (...args: any[]) => void) => void;
    };
  }
}
