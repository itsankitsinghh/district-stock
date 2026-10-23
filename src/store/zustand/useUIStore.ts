import { create } from 'zustand';

interface UIState {
  activeTab: string;
  selectedWarehouseFilter: string;
  isSyncing: boolean;
  lastSyncTime: string | null;
  networkOnline: boolean;
  activeModal: string | null;

  setActiveTab: (tab: string) => void;
  setSelectedWarehouseFilter: (whId: string) => void;
  setIsSyncing: (syncing: boolean) => void;
  setLastSyncTime: (time: string) => void;
  setNetworkOnline: (online: boolean) => void;
  openModal: (modalName: string) => void;
  closeModal: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  activeTab: 'dashboard',
  selectedWarehouseFilter: 'ALL',
  isSyncing: false,
  lastSyncTime: null,
  networkOnline: true,
  activeModal: null,

  setActiveTab: (tab: string) => set({ activeTab: tab }),
  setSelectedWarehouseFilter: (whId: string) => set({ selectedWarehouseFilter: whId }),
  setIsSyncing: (syncing: boolean) => set({ isSyncing: syncing }),
  setLastSyncTime: (time: string) => set({ lastSyncTime: time }),
  setNetworkOnline: (online: boolean) => set({ networkOnline: online }),
  openModal: (modalName: string) => set({ activeModal: modalName }),
  closeModal: () => set({ activeModal: null }),
}));
