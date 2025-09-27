import { Web3State } from '@/lib/types';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface WalletState extends Web3State {
  isInitialized: boolean;
  networkName: string | null;
  isCorrectNetwork: boolean;
}

interface WalletActions {
  setConnected: (connected: boolean) => void;
  setAccount: (account: string | null) => void;
  setChainId: (chainId: number | null) => void;
  setBalance: (balance: string | null) => void;
  setConnecting: (connecting: boolean) => void;
  setError: (error: string | null) => void;
  setNetworkName: (networkName: string | null) => void;
  setCorrectNetwork: (isCorrect: boolean) => void;
  setInitialized: (initialized: boolean) => void;
  updateWalletState: (state: Partial<Web3State>) => void;
  reset: () => void;
}

type WalletStore = WalletState & WalletActions;

const initialState: WalletState = {
  isConnected: false,
  account: null,
  chainId: null,
  balance: null,
  isConnecting: false,
  error: null,
  isInitialized: false,
  networkName: null,
  isCorrectNetwork: false,
};

export const useWalletStore = create<WalletStore>()(
  devtools(
    (set, get) => ({
      ...initialState,

      setConnected: (isConnected) => {
        set({ isConnected }, false, 'setConnected');
      },

      setAccount: (account) => {
        set({ account }, false, 'setAccount');
      },

      setChainId: (chainId) => {
        set({ chainId }, false, 'setChainId');
      },

      setBalance: (balance) => {
        set({ balance }, false, 'setBalance');
      },

      setConnecting: (isConnecting) => {
        set({ isConnecting }, false, 'setConnecting');
      },

      setError: (error) => {
        set({ error }, false, 'setError');
      },

      setNetworkName: (networkName) => {
        set({ networkName }, false, 'setNetworkName');
      },

      setCorrectNetwork: (isCorrectNetwork) => {
        set({ isCorrectNetwork }, false, 'setCorrectNetwork');
      },

      setInitialized: (isInitialized) => {
        set({ isInitialized }, false, 'setInitialized');
      },

      updateWalletState: (newState) => {
        set((state) => ({ ...state, ...newState }), false, 'updateWalletState');
      },

      reset: () => {
        set(initialState, false, 'reset');
      },
    }),
    {
      name: 'wallet-store',
    }
  )
);

// Selectors for common use cases
export const useWalletConnected = () => useWalletStore((state) => state.isConnected);
export const useWalletAccount = () => useWalletStore((state) => state.account);
export const useWalletChainId = () => useWalletStore((state) => state.chainId);
export const useWalletBalance = () => useWalletStore((state) => state.balance);
export const useWalletLoading = () => useWalletStore((state) => state.isConnecting);
export const useWalletError = () => useWalletStore((state) => state.error);
export const useWalletNetwork = () => useWalletStore((state) => state.networkName);
export const useWalletCorrectNetwork = () => useWalletStore((state) => state.isCorrectNetwork);
