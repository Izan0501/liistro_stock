import { Outlet, NavLink } from 'react-router-dom';
import { LayoutDashboard, ShoppingCart, Package, Search, Bell } from 'lucide-react';
import { cn } from '../../lib/utils';

export default function MainLayout() {
  const navItems = [
    { name: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
    { name: 'Sales', to: '/sales', icon: ShoppingCart },
    { name: 'Inventory', to: '/inventory', icon: Package },
  ];

  return (
    <div className="flex h-screen w-full overflow-hidden bg-obsidian text-text-primary">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-r border-white/5 bg-slate-900/50">
        <div className="h-16 flex items-center px-6 border-b border-white/5">
          <div className="flex items-center gap-2 text-xl font-bold tracking-tight">
            <div className="w-8 h-8 rounded bg-accent-indigo flex items-center justify-center text-white">L</div>
            <span>Liistro<span className="text-text-secondary font-medium">Stock</span></span>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                  isActive 
                    ? "bg-accent-indigo/10 text-accent-indigo" 
                    : "text-text-secondary hover:text-text-primary hover:bg-white/5"
                )
              }
            >
              <item.icon className="w-5 h-5" />
              {item.name}
            </NavLink>
          ))}
        </nav>
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
            <div className="w-8 h-8 rounded-full bg-slate-800 border border-white/10 overflow-hidden">
              <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Rodrigo" alt="User" />
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 pb-24 md:pb-8">
          <Outlet />
        </div>
      </main>

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
