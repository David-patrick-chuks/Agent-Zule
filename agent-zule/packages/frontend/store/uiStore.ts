import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface UIState {
  theme: 'light' | 'dark' | 'system';
  sidebarCollapsed: boolean;
  notifications: Notification[];
  modals: {
    walletConnect: boolean;
    delegationSettings: boolean;
    riskSettings: boolean;
    recommendationDetails: boolean;
  };
  toasts: Toast[];
  loading: {
    portfolio: boolean;
    recommendations: boolean;
    delegations: boolean;
    transactions: boolean;
  };
}

interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface Toast {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  duration?: number;
}

interface UIActions {
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => void;
  removeNotification: (id: string) => void;
  markNotificationAsRead: (id: string) => void;
  clearAllNotifications: () => void;
  openModal: (modal: keyof UIState['modals']) => void;
  closeModal: (modal: keyof UIState['modals']) => void;
  closeAllModals: () => void;
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  setLoading: (key: keyof UIState['loading'], loading: boolean) => void;
  reset: () => void;
}

type UIStore = UIState & UIActions;

const initialState: UIState = {
  theme: 'system',
  sidebarCollapsed: false,
  notifications: [],
  modals: {
    walletConnect: false,
    delegationSettings: false,
    riskSettings: false,
    recommendationDetails: false,
  },
  toasts: [],
  loading: {
    portfolio: false,
    recommendations: false,
    delegations: false,
    transactions: false,
  },
};

export const useUIStore = create<UIStore>()(
  devtools(
    (set, get) => ({
      ...initialState,

      setTheme: (theme) => {
        set({ theme }, false, 'setTheme');
      },

      toggleSidebar: () => {
        set((state) => ({ 
          sidebarCollapsed: !state.sidebarCollapsed 
        }), false, 'toggleSidebar');
      },

      setSidebarCollapsed: (sidebarCollapsed) => {
        set({ sidebarCollapsed }, false, 'setSidebarCollapsed');
      },

      addNotification: (notification) => {
        const newNotification: Notification = {
          ...notification,
          id: Math.random().toString(36).substr(2, 9),
          timestamp: new Date(),
        };
        
        set((state) => ({
          notifications: [newNotification, ...state.notifications],
        }), false, 'addNotification');
      },

      removeNotification: (id) => {
        set((state) => ({
          notifications: state.notifications.filter(n => n.id !== id),
        }), false, 'removeNotification');
      },

      markNotificationAsRead: (id) => {
        set((state) => ({
          notifications: state.notifications.map(n => 
            n.id === id ? { ...n, read: true } : n
          ),
        }), false, 'markNotificationAsRead');
      },

      clearAllNotifications: () => {
        set({ notifications: [] }, false, 'clearAllNotifications');
      },

      openModal: (modal) => {
        set((state) => ({
          modals: { ...state.modals, [modal]: true },
        }), false, 'openModal');
      },

      closeModal: (modal) => {
        set((state) => ({
          modals: { ...state.modals, [modal]: false },
        }), false, 'closeModal');
      },

      closeAllModals: () => {
        set((state) => ({
          modals: Object.keys(state.modals).reduce((acc, key) => ({
            ...acc,
            [key]: false,
          }), {} as UIState['modals']),
        }), false, 'closeAllModals');
      },

      addToast: (toast) => {
        const newToast: Toast = {
          ...toast,
          id: Math.random().toString(36).substr(2, 9),
        };
        
        set((state) => ({
          toasts: [...state.toasts, newToast],
        }), false, 'addToast');

        // Auto-remove toast after duration
        const duration = toast.duration || 5000;
        setTimeout(() => {
          get().removeToast(newToast.id);
        }, duration);
      },

      removeToast: (id) => {
        set((state) => ({
          toasts: state.toasts.filter(t => t.id !== id),
        }), false, 'removeToast');
      },

      setLoading: (key, loading) => {
        set((state) => ({
          loading: { ...state.loading, [key]: loading },
        }), false, 'setLoading');
      },

      reset: () => {
        set(initialState, false, 'reset');
      },
    }),
    {
      name: 'ui-store',
    }
  )
);

// Selectors for common use cases
export const useTheme = () => useUIStore((state) => state.theme);
export const useSidebarCollapsed = () => useUIStore((state) => state.sidebarCollapsed);
export const useNotifications = () => useUIStore((state) => state.notifications);
export const useUnreadNotifications = () => 
  useUIStore((state) => state.notifications.filter(n => !n.read));
export const useModals = () => useUIStore((state) => state.modals);
export const useToasts = () => useUIStore((state) => state.toasts);
export const useLoading = () => useUIStore((state) => state.loading);
