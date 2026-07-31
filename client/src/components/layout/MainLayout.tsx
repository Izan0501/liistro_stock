import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, ShoppingCart, Package, LogOut, User as UserIcon, ChevronLeft, History, Truck, Zap, ChevronDown, PackagePlus, TrendingUp, Sun, Moon } from 'lucide-react';
import { GlassFilter, GlassDock } from '../ui/LiquidDock';
import { cn } from '../../lib/utils';
import { useAuth } from '../../context/AuthContext';
import { useState, useEffect } from 'react';
import { NotificationBell } from '../ui/NotificationBell';
import { Toaster } from 'sonner';
import { useThemeStore } from '../../store/useThemeStore';

const navItems = [
  { name: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
  { name: 'Proveedores', to: '/purchases', icon: Truck },
  { name: 'Inventario', to: '/inventory', icon: Package },
  { name: 'Ventas', to: '/sales', icon: ShoppingCart },
  { name: 'Entregas', to: '/deliveries', icon: History },
];

export default function MainLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const { theme, toggleTheme } = useThemeStore();
  
  // Persist sidebar state
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebar_collapsed');
    return saved === 'true';
  });

  useEffect(() => {
    localStorage.setItem('sidebar_collapsed', isCollapsed.toString());
  }, [isCollapsed]);
  
  const handleConfirmLogout = () => {
    setShowLogoutModal(false);
    logout();
  };

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white overflow-hidden selection:bg-accent-indigo/30 transition-colors duration-300">
      <GlassFilter />
      {/* Desktop Sidebar */}
      <aside 
        className={cn(
          "hidden md:flex flex-col border-r border-slate-800 dark:border-slate-200 bg-slate-950 dark:bg-white text-white dark:text-slate-950 transition-[width,colors,transform] duration-300 ease-in-out relative z-[60] overflow-visible",
          isCollapsed ? "w-20" : "w-64"
        )}
      >
        <button type="button" 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3.5 top-8 z-[100] flex h-7 w-7 items-center justify-center rounded-full border border-slate-700 bg-slate-900/90 backdrop-blur-md text-slate-400 shadow-sm transition-colors transition-transform transition-shadow duration-300 ease-in-out hover:scale-110 hover:border-indigo-500 hover:text-indigo-400 hover:shadow-[0_0_15px_rgba(99,102,241,0.4)]"
          aria-label="Toggle Sidebar"
        >
          <ChevronLeft className={cn("h-4 w-4 transition-transform duration-500 ease-in-out", isCollapsed ? "rotate-180" : "rotate-0")} />
        </button>

        <div className="h-16 flex shrink-0 items-center px-5 mb-2 overflow-hidden">
          <div className={cn("flex items-center gap-3 transition-colors", isCollapsed ? "justify-center w-full" : "")}>
            <div className="relative flex shrink-0 items-center justify-center rounded-xl bg-slate-950 p-1 dark:bg-transparent dark:p-0">
              <img src="/logo.png" alt="NAVE24 Logo" className="relative z-10 h-10 w-auto object-contain mix-blend-screen sm:h-12 min-w-[32px]" />
            </div>
            <span className={cn("mt-1 text-2xl font-semibold leading-none tracking-widest text-slate-900 dark:text-slate-100 whitespace-nowrap overflow-hidden transition-all duration-200", isCollapsed ? "opacity-0 w-0" : "opacity-100 w-auto")}>NAVE24</span>
          </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto overflow-x-hidden scrollbar-none">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "flex items-center rounded-lg text-sm font-medium transition-colors duration-200 group relative",
                  isCollapsed ? "justify-center p-3" : "px-3 py-2.5 gap-3",
                  isActive 
                    ? "bg-indigo-500/10 text-indigo-400 dark:bg-indigo-50 dark:text-indigo-600" 
                    : "text-slate-400 hover:text-white hover:bg-slate-800 dark:text-slate-500 dark:hover:text-indigo-600 dark:hover:bg-slate-50"
                )
              }
              title={isCollapsed ? item.name : undefined}
            >
              <item.icon className={cn("w-5 h-5 flex-shrink-0 transition-transform group-hover:scale-110", isCollapsed ? "w-6 h-6" : "")} />
              <span className={cn("whitespace-nowrap overflow-hidden transition-opacity duration-200", isCollapsed ? "opacity-0 w-0" : "opacity-100 w-auto")}>{item.name}</span>
            </NavLink>
          ))}
        </nav>
        
        <div className="p-4 pb-6 space-y-2 mt-auto">
          <button type="button" 
            onClick={() => navigate('/profile')}
            className={cn(
              "w-full flex items-center rounded-lg text-sm font-medium transition-colors group text-slate-400 hover:text-white hover:bg-slate-800 dark:text-slate-500 dark:hover:text-indigo-600 dark:hover:bg-slate-50",
              isCollapsed ? "justify-center p-3" : "px-4 py-2.5 gap-2"
            )}
            title={isCollapsed ? "Perfil" : undefined}
          >
            <UserIcon className={cn("w-4 h-4 flex-shrink-0", isCollapsed ? "w-5 h-5" : "")} />
            <span className={cn("whitespace-nowrap overflow-hidden transition-opacity duration-200", isCollapsed ? "opacity-0 w-0" : "opacity-100 w-auto")}>Perfil</span>
          </button>
          <button type="button" 
            onClick={() => setShowLogoutModal(true)}
            className={cn(
              "w-full flex items-center rounded-lg text-sm font-medium transition-colors group text-slate-400 hover:text-red-400 hover:bg-red-500/10 dark:text-slate-500 dark:hover:text-red-600 dark:hover:bg-red-50",
              isCollapsed ? "justify-center p-3" : "px-4 py-2.5 gap-2"
            )}
            title={isCollapsed ? "Cerrar Sesión" : undefined}
          >
            <LogOut className={cn("w-4 h-4 flex-shrink-0", isCollapsed ? "w-5 h-5" : "")} />
            <span className={cn("whitespace-nowrap overflow-hidden transition-opacity duration-200", isCollapsed ? "opacity-0 w-0" : "opacity-100 w-auto")}>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
        {/* Top Header */}
        <header className="relative sticky top-0 z-40 flex h-16 w-full items-center justify-between bg-white/80 dark:bg-slate-950/80 px-4 sm:px-6 shadow-sm backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors duration-300">
          <div className="flex items-center gap-4 bg-transparent md:hidden">
            <div className="relative flex shrink-0 items-center justify-center rounded-xl bg-slate-950 p-1 dark:bg-transparent dark:p-0">
              <img src="/logo.png" alt="NAVE24 Logo" className="relative z-10 h-9 w-auto object-contain mix-blend-screen sm:h-10" />
            </div>
          </div>
          
          <div className="hidden md:flex flex-1 max-w-md items-center justify-start pl-4">
            {/* Quick Actions Premium Dropdown */}
            <div className="relative group">
              {/* Trigger Button */}
              <button type="button" className="group relative flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 transition-colors transition-shadow duration-300 bg-slate-100 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-full hover:bg-white dark:hover:bg-slate-800 hover:border-indigo-200 dark:hover:border-indigo-500/50 hover:text-slate-950 dark:hover:text-white hover:shadow-sm dark:hover:shadow-[0_0_20px_rgba(99,102,241,0.15)]">
                <Zap className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                Acciones Rápidas
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 transition-transform duration-300 group-hover:rotate-180" />
              </button>

              {/* Transparent bridge so mouse doesn't leave hover zone */}
              <div className="absolute top-full left-0 w-full h-3 pt-3" />

              {/* Dropdown Panel */}
              <div className="absolute left-0 top-full mt-3 w-72 origin-top-left rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/90 p-2 shadow-[0_8px_30px_rgb(0,0,0,0.08)] dark:shadow-2xl backdrop-blur-xl opacity-0 invisible scale-95 transition-colors transition-opacity transition-transform transition-shadow duration-200 group-hover:opacity-100 group-hover:visible group-hover:scale-100 z-50">
                {/* Section header */}
                <div className="px-3 pb-2 pt-1">
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Acciones</span>
                </div>

                {/* Nueva Venta */}
                <button type="button"                   onClick={() => navigate('/sales')}
                  className="group/item flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 transition-colors group-hover/item:border-indigo-200 dark:group-hover/item:border-indigo-500/30 group-hover/item:bg-indigo-50 dark:group-hover/item:bg-indigo-500/10 group-hover/item:text-indigo-600 dark:group-hover/item:text-indigo-400">
                    <ShoppingCart className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-slate-950 dark:text-slate-200 group-hover/item:text-indigo-600 dark:group-hover/item:text-white">Nueva Venta</span>
                    <span className="text-xs text-slate-500">Registrar salida de stock</span>
                  </div>
                </button>

                {/* Nuevo Restock */}
                <button type="button"                   onClick={() => navigate('/purchases')}
                  className="group/item flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 transition-colors group-hover/item:border-emerald-200 dark:group-hover/item:border-emerald-500/30 group-hover/item:bg-emerald-50 dark:group-hover/item:bg-emerald-500/10 group-hover/item:text-emerald-600 dark:group-hover/item:text-emerald-400">
                    <Truck className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-slate-950 dark:text-slate-200 group-hover/item:text-emerald-600 dark:group-hover/item:text-white">Nueva Compra</span>
                    <span className="text-xs text-slate-500">Registrar entrada de proveedor</span>
                  </div>
                </button>

                {/* Agregar Producto */}
                <button type="button"                   onClick={() => navigate('/inventory')}
                  className="group/item flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 transition-colors group-hover/item:border-violet-200 dark:group-hover/item:border-violet-500/30 group-hover/item:bg-violet-50 dark:group-hover/item:bg-violet-500/10 group-hover/item:text-violet-600 dark:group-hover/item:text-violet-400">
                    <PackagePlus className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-slate-950 dark:text-slate-200 group-hover/item:text-violet-600 dark:group-hover/item:text-white">Agregar Producto</span>
                    <span className="text-xs text-slate-500">Crear nuevo ítem en inventario</span>
                  </div>
                </button>

                {/* Divider */}
                <div className="my-1 mx-3 border-t border-slate-200 dark:border-slate-800/80" />

                {/* Ver Dashboard */}
                <button type="button"                   onClick={() => navigate('/dashboard')}
                  className="group/item flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 transition-colors group-hover/item:border-amber-200 dark:group-hover/item:border-amber-500/30 group-hover/item:bg-amber-50 dark:group-hover/item:bg-amber-500/10 group-hover/item:text-amber-600 dark:group-hover/item:text-amber-400">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-slate-950 dark:text-slate-200 group-hover/item:text-amber-600 dark:group-hover/item:text-white">Ver Dashboard</span>
                    <span className="text-xs text-slate-500">Resumen de métricas del negocio</span>
                  </div>
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 ml-auto">
            <button type="button"               onClick={toggleTheme}
              className="relative inline-flex h-10 w-20 items-center justify-center rounded-full bg-slate-200 dark:bg-slate-800 transition-colors duration-500 shadow-inner focus:outline-none"
              aria-label="Toggle Dark Mode"
            >
              <span className="sr-only">Toggle Dark Mode</span>
              {/* Sliding Knob */}
              <div className={`absolute top-1 left-1 flex h-8 w-8 items-center justify-center rounded-full bg-white dark:bg-slate-950 shadow-md transition-transform duration-500 ${theme === 'dark' ? 'translate-x-10' : 'translate-x-0'}`}>
                {theme === 'light' ? (
                  <Sun className="h-4 w-4 text-amber-500"/>
                ) : (
                  <Moon className="h-4 w-4 text-indigo-400"/>
                )}
              </div>
            </button>
            <NotificationBell />
            <div className="flex items-center gap-3 pl-4 border-l border-slate-200 dark:border-slate-800">
              <div className="hidden sm:block text-right">
                <div className="text-sm font-bold text-slate-950 dark:text-white leading-tight">{user?.name || 'Admin'}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Administrator</div>
              </div>
              <button 
                type="button"
                className="relative flex h-9 w-9 items-center justify-center rounded-full bg-slate-950 dark:bg-white border-2 border-white dark:border-slate-800 shadow-sm overflow-hidden hover:scale-105 transition-transform duration-300 cursor-pointer group"
                onClick={() => navigate('/profile')}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent dark:from-black/10 dark:to-transparent opacity-50 rounded-full pointer-events-none"></div>
                <span className="relative text-sm font-bold uppercase text-white dark:text-slate-950">
                  {user?.name ? user.name.substring(0, 1) : 'A'}
                </span>
              </button>
              <button type="button" 
                onClick={() => setShowLogoutModal(true)}
                className="md:hidden ml-2 p-2 text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                aria-label="Cerrar Sesión"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
          <div id="notification-tray-portal" />
        </header>

        <div className="flex-1 overflow-auto pb-32 md:pb-6">
          <Outlet />
        </div>
        {/* Global toast renderer – positioned top-center, swipeable upward */}
        <Toaster
          position="top-center"
          theme="dark"
          style={{ zIndex: 999999 }}
          toastOptions={{
            unstyled: true,
            classNames: {
              toast: "flex items-center gap-4 bg-slate-950/90 backdrop-blur-xl border border-slate-800 p-4 rounded-2xl shadow-[0_10px_40px_-10px_rgba(99,102,241,0.3)] w-full max-w-sm relative overflow-hidden pointer-events-auto transform transition-transform hover:scale-[1.02]",
              title: "text-white font-semibold text-sm",
              description: "text-slate-400 text-xs mt-0.5",
              icon: "bg-slate-800/50 p-2.5 rounded-xl text-indigo-400 flex-shrink-0",
              success: "border-l-4 !border-l-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.2)] [&_[data-icon]]:text-emerald-400 [&_[data-icon]]:bg-emerald-500/20",
              error: "border-l-4 !border-l-red-500 shadow-[0_0_15px_rgba(239,68,68,0.2)] [&_[data-icon]]:text-red-400 [&_[data-icon]]:bg-red-500/20",
              warning: "border-l-4 !border-l-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.2)] [&_[data-icon]]:text-orange-400 [&_[data-icon]]:bg-orange-500/20",
              actionButton: "bg-indigo-600 text-white text-xs rounded-lg px-3 py-1.5 hover:bg-indigo-500 transition-colors ml-auto",
              cancelButton: "text-slate-500 hover:text-white transition-colors ml-auto",
            },
          }}
        />
      </main>

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm p-4 animate-in fade-in transition-opacity duration-200">
          <div className="relative w-full max-w-sm bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 text-center shadow-[0_20px_50px_rgb(0,0,0,0.1)] dark:shadow-2xl transform transition-colors transition-transform transition-shadow animate-in zoom-in-95 duration-200">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50 dark:bg-red-500/10 mb-6">
              <LogOut className="w-8 h-8 text-red-600 dark:text-red-500" />
            </div>
            
            <h3 className="text-2xl font-bold text-slate-950 dark:text-white mb-2">
              ¿Cerrar Sesión?
            </h3>
            
            <p className="text-slate-500 dark:text-slate-400 mb-8">
              ¿Estás seguro de que deseas cerrar sesión? Tendrás que volver a ingresar tus credenciales.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3 w-full">
              <button type="button" 
                onClick={() => setShowLogoutModal(false)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold transition-colors shadow-sm"
              >
                Cancelar
              </button>
              <button type="button" 
                onClick={handleConfirmLogout}
                className="w-full px-4 py-3 rounded-xl bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 text-white font-semibold transition-colors shadow-sm"
              >
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Bottom Nav is now powered by Liquid Glass Dock */}
      <GlassDock />
    </div>
  );
}
