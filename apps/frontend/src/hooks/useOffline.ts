import { useState, useEffect, useCallback } from 'react';

export interface OfflineTicket {
  _offlineId: string;
  _createdAt: string;
  drawId: string;
  bets: Array<{ modality: string; numbers: string[]; amount: number }>;
}

export function useOffline() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Registrar Service Worker
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then(() => console.log('[SW] Registrado'))
        .catch((e) => console.warn('[SW] Error:', e));
    }
  }, []);

  // Contar tickets pendientes en IndexedDB
  const countPending = useCallback(async () => {
    if (!('indexedDB' in window)) return;
    try {
      const db = await openOfflineDB();
      const count = await new Promise<number>((resolve, reject) => {
        const tx = db.transaction('tickets', 'readonly');
        const req = tx.objectStore('tickets').count();
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
      setPendingCount(count);
    } catch {
      // IndexedDB no disponible
    }
  }, []);

  useEffect(() => {
    countPending();
    const interval = setInterval(countPending, 10_000);
    return () => clearInterval(interval);
  }, [countPending]);

  // Trigger sync manual
  const triggerSync = useCallback(async () => {
    if ('serviceWorker' in navigator && 'SyncManager' in window) {
      const reg = await navigator.serviceWorker.ready;
      await (reg as any).sync.register('sync-tickets');
    }
  }, []);

  return { isOnline, pendingCount, triggerSync };
}

function openOfflineDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('offline-pos', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('tickets', { keyPath: '_offlineId' });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
