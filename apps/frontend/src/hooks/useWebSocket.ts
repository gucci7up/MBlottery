import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/stores/authStore';

export type WSEventType =
  | 'DRAW_OPEN'
  | 'DRAW_CLOSED'
  | 'RESULT_PUBLISHED'
  | 'PRIZE_READY'
  | 'SALE_REGISTERED'
  | 'LIMIT_ALERT';

export interface WSEvent {
  type: WSEventType;
  data: Record<string, unknown>;
  timestamp: Date;
}

type WSHandler = (event: WSEvent) => void;

export function useWebSocket(onEvent?: WSHandler) {
  const socketRef = useRef<Socket | null>(null);
  const handlerRef = useRef<WSHandler | undefined>(onEvent);
  const { user, accessToken, isAuthenticated } = useAuthStore();

  // Keep handler ref current without re-connecting
  handlerRef.current = onEvent;

  const emit = useCallback((event: string, data?: unknown) => {
    socketRef.current?.emit(event, data);
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !user || !accessToken) return;

    const wsUrl = import.meta.env.VITE_WS_URL ?? '';
    const socket = io(`${wsUrl}/events`, {
      query: { operatorId: user.operatorId },
      auth: { token: accessToken },
      transports: ['websocket'],
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });

    const EVENTS: WSEventType[] = [
      'DRAW_OPEN', 'DRAW_CLOSED', 'RESULT_PUBLISHED',
      'PRIZE_READY', 'SALE_REGISTERED', 'LIMIT_ALERT',
    ];

    EVENTS.forEach((eventType) => {
      socket.on(eventType, (data: Record<string, unknown>) => {
        handlerRef.current?.({ type: eventType, data, timestamp: new Date() });
      });
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [isAuthenticated, user?.operatorId, accessToken]);

  return { emit, connected: !!socketRef.current?.connected };
}
