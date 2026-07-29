import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Package, Truck, ShoppingCart, History } from 'lucide-react';
import { cn } from '../../lib/utils';

export const GlassFilter = () => (
  <svg style={{ width: 0, height: 0, position: 'absolute', pointerEvents: 'none' }} xmlns="http://www.w3.org/2000/svg" version="1.1">
    <defs>
      <filter id="glass-distortion">
        <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
        <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7" result="goo" />
        <feComposite in="SourceGraphic" in2="goo" operator="atop" />
      </filter>
    </defs>
  </svg>
);

export const GlassDock = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const items = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, to: '/dashboard' },
    { id: 'inventory', label: 'Inventory', icon: Package, to: '/inventory' },
    { id: 'purchases', label: 'Proveedores', icon: Truck, to: '/purchases' },
    { id: 'deliveries', label: 'Entregas', icon: History, to: '/deliveries' },
    { id: 'sales', label: 'Nueva Venta', icon: ShoppingCart, to: '/sales' },
  ];

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] flex md:hidden items-center gap-2 px-4 py-3 rounded-full bg-slate-950/90 dark:bg-white/90 backdrop-blur-xl border border-slate-800 dark:border-slate-200 shadow-2xl transition-all duration-300">
      {items.map((item) => {
        const isActive = location.pathname.startsWith(item.to);
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            onClick={() => navigate(item.to)}
            title={item.label}
            className={cn(
              "relative group flex items-center justify-center h-12 w-12 rounded-full transition-all duration-300",
              isActive 
                ? "bg-indigo-600 text-white dark:bg-indigo-100 dark:text-indigo-600 shadow-[0_0_15px_rgba(79,70,229,0.3)] dark:shadow-none" 
                : "text-slate-400 hover:text-slate-200 dark:text-slate-500 dark:hover:text-slate-700 bg-transparent"
            )}
          >
            <Icon className="w-5 h-5 transition-transform duration-300 group-hover:scale-110" strokeWidth={1.5} />
            {isActive && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-white dark:bg-indigo-600 shadow-[0_0_8px_rgba(255,255,255,0.8)] dark:shadow-none" />
            )}
          </button>
        );
      })}
    </div>
  );
};
