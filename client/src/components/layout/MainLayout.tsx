import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, ShoppingCart, Package, Bell, LogOut, User as UserIcon, ChevronLeft, ChevronRight, History, Truck, Zap, ChevronDown, PackagePlus, TrendingUp } from 'lucide-react';
import { GlassFilter, GlassDock } from '../ui/LiquidDock';
import { cn } from '../../lib/utils';
import { useAuth } from '../../context/AuthContext';
import { useState, useEffect } from 'react';

export default function MainLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  
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
  
  const navItems = [
    { name: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
    { name: 'Sales', to: '/sales', icon: ShoppingCart },
    { name: 'Deliveries', to: '/deliveries', icon: History },
    { name: 'Purchases', to: '/purchases', icon: Truck },
    { name: 'Inventory', to: '/inventory', icon: Package },
  ];

  return (
    <div className="flex h-screen bg-slate-950 text-text-primary overflow-hidden selection:bg-accent-indigo/30">
      <GlassFilter />
      {/* Desktop Sidebar */}
      <aside 
        className={cn(
          "hidden md:flex flex-col border-r border-white/5 bg-slate-900/50 transition-all duration-300 ease-in-out relative",
          isCollapsed ? "w-20" : "w-64"
        )}
      >
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-6 w-6 h-6 bg-slate-800 border border-white/10 rounded-full flex items-center justify-center text-text-secondary hover:text-white hover:border-accent-indigo transition-colors z-20"
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>

        <div className="h-16 flex items-center px-5 border-b border-white/5">
          <div className={cn("flex items-center gap-2 text-xl font-bold tracking-tight transition-all", isCollapsed ? "justify-center w-full" : "")}>
            <div className="min-w-[32px] w-8 h-8 rounded bg-accent-indigo flex items-center justify-center text-white">L</div>
            {!isCollapsed && <span className="whitespace-nowrap overflow-hidden">Liistro<span className="text-text-secondary font-medium">Stock</span></span>}
          </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto overflow-x-hidden scrollbar-none">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "flex items-center rounded-lg text-sm font-medium transition-all duration-200 group relative",
                  isCollapsed ? "justify-center p-3" : "px-3 py-2.5 gap-3",
                  isActive 
                    ? "bg-accent-indigo/10 text-accent-indigo" 
                    : "text-text-secondary hover:text-text-primary hover:bg-white/5"
                )
              }
              title={isCollapsed ? item.name : undefined}
            >
              <item.icon className={cn("w-5 h-5 flex-shrink-0 transition-transform group-hover:scale-110", isCollapsed ? "w-6 h-6" : "")} />
              {!isCollapsed && <span className="whitespace-nowrap">{item.name}</span>}
            </NavLink>
          ))}
        </nav>
        
        <div className="p-4 border-t border-white/5 space-y-2">
          <button 
            onClick={() => navigate('/profile')}
            className={cn(
              "w-full flex items-center rounded-lg text-sm font-medium text-text-secondary hover:text-white hover:bg-white/5 transition-colors group",
              isCollapsed ? "justify-center p-3" : "px-4 py-2.5 gap-2"
            )}
            title={isCollapsed ? "Perfil" : undefined}
          >
            <UserIcon className={cn("w-4 h-4 flex-shrink-0", isCollapsed ? "w-5 h-5" : "")} />
            {!isCollapsed && <span className="whitespace-nowrap">Perfil</span>}
          </button>
          <button 
            onClick={() => setShowLogoutModal(true)}
            className={cn(
              "w-full flex items-center rounded-lg text-sm font-medium text-text-secondary hover:text-accent-red hover:bg-accent-red/10 transition-colors group",
              isCollapsed ? "justify-center p-3" : "px-4 py-2.5 gap-2"
            )}
            title={isCollapsed ? "Cerrar Sesión" : undefined}
          >
            <LogOut className={cn("w-4 h-4 flex-shrink-0", isCollapsed ? "w-5 h-5" : "")} />
            {!isCollapsed && <span className="whitespace-nowrap">Cerrar Sesión</span>}
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-16 flex items-center justify-between px-4 md:px-8 border-b border-white/5 glassmorphism sticky top-0 z-10">
          <div className="flex items-center gap-4 md:hidden">
            <div className="w-8 h-8 rounded bg-accent-indigo flex items-center justify-center text-white font-bold">L</div>
          </div>
          
          <div className="hidden md:flex flex-1 max-w-md items-center justify-start pl-4">
            {/* Quick Actions Premium Dropdown */}
            <div className="relative group">
              {/* Trigger Button */}
              <button className="group relative flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-200 transition-all duration-300 bg-slate-900/50 border border-slate-800 rounded-full hover:bg-slate-800 hover:border-indigo-500/50 hover:text-white hover:shadow-[0_0_20px_rgba(99,102,241,0.15)]">
                <Zap className="w-3.5 h-3.5 text-indigo-400" />
                Acciones Rápidas
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 transition-transform duration-300 group-hover:rotate-180" />
              </button>

              {/* Transparent bridge so mouse doesn't leave hover zone */}
              <div className="absolute top-full left-0 w-full h-3 pt-3" />

              {/* Dropdown Panel */}
              <div className="absolute left-0 top-full mt-3 w-72 origin-top-left rounded-2xl border border-slate-800 bg-slate-950/90 p-2 shadow-2xl backdrop-blur-xl opacity-0 invisible scale-95 transition-all duration-200 group-hover:opacity-100 group-hover:visible group-hover:scale-100 z-50">
                {/* Section header */}
                <div className="px-3 pb-2 pt-1">
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Acciones</span>
                </div>

                {/* Nueva Venta */}
                <button
                  onClick={() => navigate('/sales')}
                  className="group/item flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-all hover:bg-slate-800/60"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-slate-400 transition-colors group-hover/item:border-indigo-500/30 group-hover/item:bg-indigo-500/10 group-hover/item:text-indigo-400">
                    <ShoppingCart className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-slate-200 group-hover/item:text-white">Nueva Venta</span>
                    <span className="text-xs text-slate-500">Registrar salida de stock</span>
                  </div>
                </button>

                {/* Nuevo Restock */}
                <button
                  onClick={() => navigate('/purchases')}
                  className="group/item flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-all hover:bg-slate-800/60"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-slate-400 transition-colors group-hover/item:border-emerald-500/30 group-hover/item:bg-emerald-500/10 group-hover/item:text-emerald-400">
                    <Truck className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-slate-200 group-hover/item:text-white">Nueva Compra</span>
                    <span className="text-xs text-slate-500">Registrar entrada de proveedor</span>
                  </div>
                </button>

                {/* Agregar Producto */}
                <button
                  onClick={() => navigate('/inventory')}
                  className="group/item flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-all hover:bg-slate-800/60"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-slate-400 transition-colors group-hover/item:border-violet-500/30 group-hover/item:bg-violet-500/10 group-hover/item:text-violet-400">
                    <PackagePlus className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-slate-200 group-hover/item:text-white">Agregar Producto</span>
                    <span className="text-xs text-slate-500">Crear nuevo ítem en inventario</span>
                  </div>
                </button>

                {/* Divider */}
                <div className="my-1 mx-3 border-t border-slate-800/80" />

                {/* Ver Dashboard */}
                <button
                  onClick={() => navigate('/dashboard')}
                  className="group/item flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-all hover:bg-slate-800/60"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-slate-400 transition-colors group-hover/item:border-amber-500/30 group-hover/item:bg-amber-500/10 group-hover/item:text-amber-400">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-slate-200 group-hover/item:text-white">Ver Dashboard</span>
                    <span className="text-xs text-slate-500">Resumen de métricas del negocio</span>
                  </div>
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 ml-auto">
            <button className="relative p-2 text-text-secondary hover:text-text-primary transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-accent-red"></span>
            </button>
            <div className="flex items-center gap-3 pl-4 border-l border-white/10">
              <div className="hidden sm:block text-right">
                <div className="text-sm font-bold text-text-primary leading-tight">{user?.name || 'Admin'}</div>
                <div className="text-xs text-text-secondary">Administrator</div>
              </div>
              <div 
                className="w-8 h-8 rounded-full bg-slate-800 border border-white/10 overflow-hidden cursor-pointer hover:border-accent-indigo transition-colors"
                onClick={() => navigate('/profile')}
              >
                <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name || 'Rodrigo'}`} alt="User" />
              </div>
              <button 
                onClick={() => setShowLogoutModal(true)}
                className="md:hidden ml-2 p-2 text-text-secondary hover:text-accent-red transition-colors"
                aria-label="Cerrar Sesión"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto bg-black/40 pb-32 md:pb-6">
          <Outlet />
        </div>
      </main>

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-obsidian border border-white/10 rounded-2xl p-6 md:p-8 max-w-sm w-full shadow-[0_0_40px_rgba(0,0,0,0.5)] transform scale-100 animate-in zoom-in-95 duration-200">
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 rounded-full bg-accent-red/10 flex items-center justify-center border border-accent-red/20 shadow-[0_0_20px_rgba(239,68,68,0.2)]">
                <LogOut className="w-8 h-8 text-accent-red" />
              </div>
            </div>
            
            <h3 className="text-xl font-bold text-white text-center mb-2">
              ¿Cerrar Sesión?
            </h3>
            
            <p className="text-text-secondary text-center text-sm mb-8">
              ¿Estás seguro de que deseas cerrar sesión? Tendrás que volver a ingresar tus credenciales.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <button 
                onClick={() => setShowLogoutModal(false)}
                className="flex-1 px-4 py-2.5 rounded-lg font-medium text-white bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={handleConfirmLogout}
                className="flex-1 px-4 py-2.5 rounded-lg font-medium text-white bg-accent-red hover:bg-red-600 shadow-[0_0_15px_rgba(239,68,68,0.4)] hover:shadow-[0_0_25px_rgba(239,68,68,0.6)] transition-all"
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
