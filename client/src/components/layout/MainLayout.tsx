import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, ShoppingCart, Package, Search, Bell, LogOut, User as UserIcon, ChevronLeft, ChevronRight } from 'lucide-react';
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
    { name: 'Inventory', to: '/inventory', icon: Package },
  ];

  return (
    <div className="flex h-screen w-full overflow-hidden bg-obsidian text-text-primary">
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
          
          <div className="hidden md:flex flex-1 max-w-md">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
              <input 
                type="text" 
                placeholder="Search anything (Ctrl+K)..." 
                className="w-full bg-black/20 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-accent-indigo transition-colors"
              />
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

        <div className="flex-1 overflow-auto bg-black/40">
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

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 glassmorphism border-t border-white/5 pb-safe z-20">
        <div className="flex justify-around items-center h-16 px-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center justify-center w-full h-full gap-1 text-xs font-medium transition-colors",
                  isActive ? "text-accent-indigo" : "text-text-secondary"
                )
              }
            >
              <item.icon className="w-6 h-6" />
              {item.name}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
