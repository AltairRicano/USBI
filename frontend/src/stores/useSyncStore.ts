import { create } from 'zustand';

export interface SyncState {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncTime: string | null;
  pendingItemsCount: number;
  
  setOnlineStatus: (status: boolean) => void;
  setSyncing: (isSyncing: boolean) => void;
  recordSyncSuccess: () => void;
  setPendingCount: (count: number) => void;
}

export const useSyncStore = create<SyncState>((set) => ({
  isOnline: true,
  isSyncing: false,
  lastSyncTime: null,
  pendingItemsCount: 0,

  setOnlineStatus: (status) => set({ isOnline: status }),
  setSyncing: (isSyncing) => set({ isSyncing }),
  recordSyncSuccess: () => set({ lastSyncTime: new Date().toISOString(), isSyncing: false, pendingItemsCount: 0 }),
  setPendingCount: (count) => set({ pendingItemsCount: count }),
}));
