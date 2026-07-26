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
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex md:hidden">
      <div 
        className="flex items-center gap-3 p-3 rounded-[2rem] bg-slate-950/80 backdrop-blur-2xl border border-white/5 shadow-2xl relative"
        style={{ filter: 'url(#glass-distortion)' }}
      >
        {items.map((item) => {
          const isActive = location.pathname.startsWith(item.to);
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.to)}
              title={item.label}
              className={cn(
                "relative group flex items-center justify-center w-[3.25rem] h-[3.25rem] rounded-[1.25rem] transition-all duration-300 ease-out",
                isActive 
                  ? "bg-accent-indigo text-white scale-110 shadow-[0_0_20px_rgba(99,102,241,0.5)] z-10" 
                  : "bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white hover:scale-125 z-0"
              )}
            >
              <Icon className="w-6 h-6 transition-transform duration-300 group-hover:scale-110" />
              {isActive && (
                <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_white]" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
