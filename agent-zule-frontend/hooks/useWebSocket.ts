'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface SocketMessage {
  type: string;
  data: any;
  timestamp: string;
}

interface SocketState {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  lastMessage: SocketMessage | null;
}

export function useWebSocket(userId?: string) {
  const [state, setState] = useState<SocketState>({
    isConnected: false,
    isConnecting: false,
    error: null,
    lastMessage: null,
  });

  const socketRef = useRef<Socket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const reconnectDelay = 3000;

  const connect = useCallback(() => {
    if (socketRef.current?.connected) {
      return;
    }

    setState(prev => ({ ...prev, isConnecting: true, error: null }));

    try {
      const socketUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
      const socket = io(socketUrl, {
        transports: ['websocket', 'polling'],
        autoConnect: true,
      });
      
      socket.on('connect', () => {
        console.log('Socket.io connected');
        setState(prev => ({
          ...prev,
          isConnected: true,
          isConnecting: false,
          error: null,
        }));
        reconnectAttempts.current = 0;

        // Authenticate if userId is provided
        if (userId) {
          socket.emit('authenticate', { userId });
        }
      });

      socket.on('authenticated', (data) => {
        console.log('Socket.io authenticated:', data);
      });

      socket.on('disconnect', (reason) => {
        console.log('Socket.io disconnected:', reason);
        setState(prev => ({
          ...prev,
          isConnected: false,
          isConnecting: false,
        }));

        // Attempt to reconnect if not a manual disconnect
        if (reason !== 'io client disconnect' && reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current++;
          console.log(`Attempting to reconnect (${reconnectAttempts.current}/${maxReconnectAttempts})...`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectDelay * reconnectAttempts.current);
        }
      });

      socket.on('connect_error', (error) => {
        console.error('Socket.io connection error:', error);
        setState(prev => ({
          ...prev,
          isConnecting: false,
          error: 'Socket.io connection error',
        }));
      });

      // Listen for real-time events
      socket.on('portfolio_update', (data) => {
        setState(prev => ({
          ...prev,
          lastMessage: { type: 'portfolio_update', data, timestamp: new Date().toISOString() },
        }));
      });

      socket.on('recommendations_update', (data) => {
        setState(prev => ({
          ...prev,
          lastMessage: { type: 'recommendations_update', data, timestamp: new Date().toISOString() },
        }));
      });

      socket.on('permission_update', (data) => {
        setState(prev => ({
          ...prev,
          lastMessage: { type: 'permission_update', data, timestamp: new Date().toISOString() },
        }));
      });

      socket.on('market_update', (data) => {
        setState(prev => ({
          ...prev,
          lastMessage: { type: 'market_update', data, timestamp: new Date().toISOString() },
        }));
      });

      socket.on('opportunities_update', (data) => {
        setState(prev => ({
          ...prev,
          lastMessage: { type: 'opportunities_update', data, timestamp: new Date().toISOString() },
        }));
      });

      socketRef.current = socket;
    } catch (error) {
      console.error('Socket.io connection error:', error);
      setState(prev => ({
        ...prev,
        isConnecting: false,
        error: 'Failed to create Socket.io connection',
      }));
    }
  }, [userId]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    setState(prev => ({
      ...prev,
      isConnected: false,
      isConnecting: false,
    }));
  }, []);

  const emit = useCallback((event: string, data: any) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data);
      return true;
    }
    return false;
  }, []);

  const subscribe = useCallback((channel: string, filters?: any) => {
    return emit('subscribe', { channel, filters });
  }, [emit]);

  const unsubscribe = useCallback((channel: string) => {
    return emit('unsubscribe', { channel });
  }, [emit]);

  // Auto-connect on mount
  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  return {
    ...state,
    connect,
    disconnect,
    emit,
    subscribe,
    unsubscribe,
  };
}
