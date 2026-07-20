import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { getSessionPersistenceStorage } from '../lib/persistenceStorage';

export interface SyncState {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncTime: string | null;
  pendingItemsCount: number;
  deviceId: string | null;
  
  setOnlineStatus: (status: boolean) => void;
  setSyncing: (isSyncing: boolean) => void;
  recordSyncSuccess: () => void;
  setPendingCount: (count: number) => void;
  setDeviceId: (deviceId: string | null) => void;
}

export const useSyncStore = create<SyncState>()(
  persist(
    (set) => ({
      isOnline: true,
      isSyncing: false,
      lastSyncTime: null,
      pendingItemsCount: 0,
      deviceId: null,

      setOnlineStatus: (status) => set({ isOnline: status }),
      setSyncing: (isSyncing) => set({ isSyncing }),
      recordSyncSuccess: () => set({ lastSyncTime: new Date().toISOString(), isSyncing: false, pendingItemsCount: 0 }),
      setPendingCount: (count) => set({ pendingItemsCount: count }),
      setDeviceId: (deviceId) => set({ deviceId }),
    }),
    {
      name: 'usbi-sync',
      storage: createJSONStorage(getSessionPersistenceStorage),
      partialize: (state) => ({ deviceId: state.deviceId, lastSyncTime: state.lastSyncTime }),
    }
  )
);
