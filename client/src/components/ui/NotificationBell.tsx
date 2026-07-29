import { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  Bell, AlertTriangle, Check, Trash2,
  ShoppingCart, Package, Shield, Activity, PlusSquare,
} from 'lucide-react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import {
  useNotificationStore,
  type AppNotification,
  type StockNotification,
  type ActivityNotification,
} from '../../hooks/useNotificationStore';
import { cn } from '../../lib/utils';

// ─── Contextual icon for activity events ─────────────────────────────────────
function ActivityIcon({ type, user }: { type: ActivityNotification['type']; user: string }) {
  if (type === 'sale' || user === 'Terminal de Ventas')
    return <ShoppingCart className="w-4 h-4 text-emerald-400" />;
  if (type === 'restock' || user === 'Logística y Compras')
    return <Package className="w-4 h-4 text-blue-400" />;
  if (type === 'security' || user === 'Sistema de Seguridad')
    return <Shield className="w-4 h-4 text-indigo-400" />;
  if (type === 'product' || user === 'Gestión de Inventario')
    return <PlusSquare className="w-4 h-4 text-purple-400" />;
  return <Activity className="w-4 h-4 text-slate-400" />;
}

function activityBg(type: ActivityNotification['type'], user: string) {
  if (type === 'sale' || user === 'Terminal de Ventas') return 'bg-emerald-500/15';
  if (type === 'restock' || user === 'Logística y Compras') return 'bg-blue-500/15';
  if (type === 'security' || user === 'Sistema de Seguridad') return 'bg-indigo-500/15';
  if (type === 'product' || user === 'Gestión de Inventario') return 'bg-purple-500/15';
  return 'bg-slate-700/40';
}

// Safe date parsing helper
const getSafeDate = (timeValue: any) => {
  if (!timeValue) return new Date();
  // If it's already a date object
  if (timeValue instanceof Date) return timeValue;
  // If it's a string from localStorage or hardcoded "Justo ahora"
  if (timeValue === "Justo ahora") return new Date(); 
  return new Date(timeValue);
};

const timeAgo = (timeValue: any) => {
  const date = getSafeDate(timeValue);
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  
  if (seconds < 60) return "Justo ahora";
  if (seconds < 3600) return `Hace ${Math.floor(seconds / 60)} min`;
  if (seconds < 86400) return `Hace ${Math.floor(seconds / 3600)} horas`;
  return `Hace ${Math.floor(seconds / 86400)} días`;
};

// ─── Swipeable Notification Row ───────────────────────────────────────────────
function NotificationRow({ n }: { n: AppNotification }) {
  const { markAsRead, deleteNotification } = useNotificationStore();
  const navigate = useNavigate();
  const x = useMotionValue(0);
  const isDragging = useRef(false);

  const greenOpacity = useTransform(x, [0, 80], [0, 1]);
  const redOpacity = useTransform(x, [-80, 0], [1, 0]);

  const handleDragEnd = () => {
    const current = x.get();
    if (current > 60) {
      animate(x, 400, { duration: 0.2, onComplete: () => markAsRead(n.id) });
    } else if (current < -60) {
      animate(x, -400, { duration: 0.2, onComplete: () => deleteNotification(n.id) });
    } else {
      animate(x, 0, { type: 'spring', stiffness: 500, damping: 30 });
    }
  };

  const handleClick = () => {
    if (isDragging.current) return;
    markAsRead(n.id);
    // Only low-stock alerts deep-link to inventory
    if (n.type === 'low_stock') {
      navigate(`/inventory?restock=${(n as StockNotification).productId}`);
    }
  };

  const timeLabel = timeAgo(n.time);

  // ── Low-stock alert row ──
  if (n.type === 'low_stock') {
    const s = n as StockNotification;
    return (
      <li className="relative overflow-hidden rounded-xl">
        <motion.div className="absolute inset-0 flex items-center justify-start pl-4 bg-emerald-500/20 rounded-xl" style={{ opacity: greenOpacity }}>
          <Check className="w-5 h-5 text-emerald-400" />
        </motion.div>
        <motion.div className="absolute inset-0 flex items-center justify-end pr-4 bg-red-500/20 rounded-xl" style={{ opacity: redOpacity }}>
          <Trash2 className="w-5 h-5 text-red-400" />
        </motion.div>
        <motion.div
          style={{ x }}
          drag="x"
          dragConstraints={{ left: -100, right: 100 }}
          dragElastic={0.1}
          onDragStart={() => { isDragging.current = true; }}
          onDragEnd={() => { handleDragEnd(); setTimeout(() => { isDragging.current = false; }, 50); }}
          onClick={handleClick}
          className={cn(
            'relative z-10 flex gap-3 p-4 border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors cursor-pointer select-none',
          )}
        >
          <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', s.stock <= 5 ? 'bg-red-500/15 text-red-400' : 'bg-orange-500/15 text-orange-400')}>
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-950 dark:text-white truncate">{s.productName}</p>
            <p className="text-xs text-slate-400 mt-0.5">
              ¡Stock crítico! Quedan{' '}
              <span className={cn('font-bold', s.stock <= 5 ? 'text-red-400' : 'text-orange-400')}>{s.stock}</span>{' '}
              unidades.
            </p>
            <p className="text-[10px] text-slate-600 mt-1">{timeLabel}</p>
          </div>
          {!s.isRead && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-orange-400 animate-pulse" />}
        </motion.div>
      </li>
    );
  }

  // ── Activity event row ──
  const a = n as ActivityNotification;
  return (
    <li className="relative overflow-hidden rounded-xl">
      <motion.div className="absolute inset-0 flex items-center justify-start pl-4 bg-emerald-500/20 rounded-xl" style={{ opacity: greenOpacity }}>
        <Check className="w-5 h-5 text-emerald-400" />
      </motion.div>
      <motion.div className="absolute inset-0 flex items-center justify-end pr-4 bg-red-500/20 rounded-xl" style={{ opacity: redOpacity }}>
        <Trash2 className="w-5 h-5 text-red-400" />
      </motion.div>
      <motion.div
        style={{ x }}
        drag="x"
        dragConstraints={{ left: -100, right: 100 }}
        dragElastic={0.1}
        onDragStart={() => { isDragging.current = true; }}
        onDragEnd={() => { handleDragEnd(); setTimeout(() => { isDragging.current = false; }, 50); }}
        onClick={handleClick}
        className={cn(
          'relative z-10 flex gap-3 p-4 border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors cursor-pointer select-none',
        )}
      >
        <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', activityBg(a.type, a.user))}>
          <ActivityIcon type={a.type} user={a.user} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-slate-950 dark:text-white truncate">{a.user}</p>
          <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{a.message}</p>
          <p className="text-[10px] text-slate-600 mt-1">{timeLabel}</p>
        </div>
        {!a.isRead && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-indigo-400 animate-pulse" />}
      </motion.div>
    </li>
  );
}

// ─── Main NotificationBell ────────────────────────────────────────────────────
export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const { notifications, unreadCount, clearAll } = useNotificationStore();
  const unreadNotifications = notifications
    .filter(n => !n.isRead)
    .sort((a, b) => getSafeDate(b.time).getTime() - getSafeDate(a.time).getTime());

  const [portalNode, setPortalNode] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setPortalNode(document.getElementById('notification-tray-portal'));
  }, []);

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 text-slate-400 hover:text-slate-950 dark:text-white transition-colors rounded-lg hover:bg-slate-800/60"
        aria-label="Notificaciones"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-400" />
          </span>
        )}
      </button>

      {open && portalNode && createPortal(
        <>
          <div className="fixed inset-0 z-[90]" onClick={() => setOpen(false)} />
          <div className="
            absolute top-[calc(100%+0.5rem)] right-4 z-[100]
            w-[calc(100vw-2rem)] sm:w-[380px] sm:right-6
            bg-white dark:bg-slate-950 
            border border-slate-200 dark:border-slate-800 
            rounded-2xl shadow-[0_20px_60px_rgb(0,0,0,0.12)] dark:shadow-2xl 
            overflow-hidden origin-top-right transition-all duration-200 animate-in zoom-in-95 fade-in
          ">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800/50">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-indigo-400" />
                <h3 className="font-semibold text-slate-950 dark:text-white">Activity Stream</h3>
              </div>
              <button 
                onClick={clearAll}
                className="text-xs text-slate-500 hover:text-slate-950 dark:hover:text-white transition-colors"
              >
                Limpiar
              </button>
            </div>

            {/* List */}
            <div className="max-h-[60vh] overflow-y-auto px-2 py-2 space-y-1 scrollbar-none relative z-10">
              {unreadNotifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 gap-2">
                  <Check className="w-8 h-8 text-emerald-500/40" />
                  <p className="text-xs text-slate-500">Bandeja limpia</p>
                </div>
              ) : (
                <ul className="space-y-1">
                  {unreadNotifications.map((n) => (
                    <NotificationRow key={n.id} n={n} />
                  ))}
                </ul>
              )}
            </div>

            {/* Swipe hint */}
            {unreadNotifications.length > 0 && (
              <div className="px-4 py-2 border-t border-slate-800/60 relative z-10">
                <p className="text-[9px] text-slate-600 text-center">
                  ← Desliza para eliminar · Desliza → para marcar leído
                </p>
              </div>
            )}
          </div>
        </>,
        portalNode
      )}
    </>
  );
}
