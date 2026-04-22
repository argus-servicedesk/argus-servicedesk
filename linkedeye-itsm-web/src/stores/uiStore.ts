import { create } from 'zustand';

interface UINotification {
  id: string; title: string; message: string;
  type: 'info' | 'warning' | 'error' | 'success'; read: boolean; timestamp: string; link?: string;
}

interface UIState {
  sidebarCollapsed: boolean;
  commandPaletteOpen: boolean;
  notifications: UINotification[];
  toggleSidebar: () => void;
  addNotification: (n: Omit<UINotification, 'id' | 'read' | 'timestamp'>) => void;
  markNotificationRead: (id: string) => void;
  markAllRead: () => void;
  clearNotifications: () => void;
}

export const useUIStore = create<UIState>()((set) => ({
  sidebarCollapsed: false, commandPaletteOpen: false, notifications: [],
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  addNotification: (n) => set((s) => ({
    notifications: [{ ...n, id: Date.now().toString(36) + Math.random().toString(36).slice(2), read: false, timestamp: new Date().toISOString() }, ...s.notifications],
  })),
  markNotificationRead: (id) => set((s) => ({ notifications: s.notifications.map((n) => n.id === id ? { ...n, read: true } : n) })),
  markAllRead: () => set((s) => ({ notifications: s.notifications.map((n) => ({ ...n, read: true })) })),
  clearNotifications: () => set({ notifications: [] }),
}));
