import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ── Low-stock alert (existing) ──────────────────────────────────────────────
export interface StockNotification {
  id: string;
  type: 'low_stock';
  productId: string;
  productName: string;
  stock: number;
  isRead: boolean;
  time: string;
}

// ── Generic activity event (new) ────────────────────────────────────────────
export interface ActivityNotification {
  id: string;
  type: 'sale' | 'restock' | 'security' | 'product' | 'system';
  user: string;       // e.g. "Terminal de Ventas"
  message: string;    // e.g. "Venta registrada: 3x Coca-Cola"
  isRead: boolean;
  time: string;
}

export type AppNotification = StockNotification | ActivityNotification;

interface NotificationStore {
  notifications: AppNotification[];
  unreadCount: number;
  addLowStockAlert: (n: Pick<StockNotification, 'productId' | 'productName' | 'stock'>) => void;
  addActivityEvent: (n: Pick<ActivityNotification, 'type' | 'user' | 'message'>) => void;
  /** @deprecated Use addLowStockAlert — kept for backwards compat */
  addNotification: (n: Pick<StockNotification, 'productId' | 'productName' | 'stock'>) => void;
  markAsRead: (id: string) => void;
  deleteNotification: (id: string) => void;
  clearAll: () => void;
}

export const useNotificationStore = create<NotificationStore>()(
  persist(
    (set, get) => ({
      notifications: [],
      unreadCount: 0,

  addLowStockAlert: (n) => {
    // De-duplicate: if the same product is already unread, just update stock
    const existing = get().notifications.find(
      (x) => x.type === 'low_stock' && (x as StockNotification).productId === n.productId && !x.isRead
    ) as StockNotification | undefined;

    if (existing) {
      set((s) => ({
        notifications: s.notifications.map((x) =>
          x.id === existing.id ? { ...x, stock: n.stock, time: new Date().toISOString() } : x
        ),
      }));
      return;
    }

    const notification: StockNotification = {
      type: 'low_stock',
      ...n,
      id: crypto.randomUUID(),
      isRead: false,
      time: new Date().toISOString(),
    };

    set((s) => ({
      notifications: [notification, ...s.notifications],
      unreadCount: s.unreadCount + 1,
    }));
  },

  addActivityEvent: (n) => {
    const notification: ActivityNotification = {
      ...n,
      id: crypto.randomUUID(),
      isRead: false,
      time: new Date().toISOString(),
    };

    set((s) => ({
      notifications: [notification, ...s.notifications],
      unreadCount: s.unreadCount + 1,
    }));
  },

  // Backwards-compat alias
  addNotification: (n) => {
    get().addLowStockAlert(n);
  },

  markAsRead: (id) => {
    set((s) => ({
      notifications: s.notifications.map((n) =>
        n.id === id ? { ...n, isRead: true } : n
      ),
      unreadCount: Math.max(
        0,
        s.notifications.filter((n) => !n.isRead && n.id !== id).length
      ),
    }));
  },

  deleteNotification: (id) => {
    set((s) => {
      const target = s.notifications.find((n) => n.id === id);
      return {
        notifications: s.notifications.filter((n) => n.id !== id),
        unreadCount: target && !target.isRead
          ? Math.max(0, s.unreadCount - 1)
          : s.unreadCount,
      };
    });
  },

  clearAll: () => set({ notifications: [], unreadCount: 0 }),
    }),
    {
      name: 'axon-notifications-storage', // The key in localStorage
    }
  )
);
