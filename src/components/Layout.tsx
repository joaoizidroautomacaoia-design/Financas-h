import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Receipt, CalendarDays, BarChart3, Landmark, ArrowLeftRight, Menu, X, LogOut } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

const links = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/bills', label: 'Contas', icon: Receipt },
  { to: '/calendar', label: 'Calendário', icon: CalendarDays },
  { to: '/reports', label: 'Relatórios', icon: BarChart3 },
  { to: '/bank-accounts', label: 'Bancos', icon: Landmark },
  { to: '/transactions', label: 'Transações', icon: ArrowLeftRight },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { signOut, user } = useAuth();

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-sidebar border-r border-sidebar-border p-4 gap-1">
        <div className="flex items-center gap-3 px-3 py-4 mb-6">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center glow-primary">
            <span className="text-primary-foreground font-bold text-sm">₿</span>
          </div>
          <span className="gradient-text font-bold text-xl tracking-tight">FinControl</span>
        </div>
        <nav className="space-y-1">
          {links.map(l => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                `group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-primary/10 text-primary border border-primary/20 shadow-sm shadow-primary/10'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground hover:translate-x-1'
                }`
              }
            >
              <l.icon size={18} className="transition-transform duration-200 group-hover:scale-110" />
              {l.label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto pt-4 border-t border-sidebar-border">
          <p className="text-xs text-sidebar-foreground truncate px-3 mb-2">{user?.email}</p>
          <button
            onClick={signOut}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground hover:bg-destructive/10 hover:text-destructive transition-all duration-200 w-full"
          >
            <LogOut size={18} />
            Sair
          </button>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-sidebar/95 backdrop-blur-md border-b border-sidebar-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-xs">₿</span>
          </div>
          <span className="gradient-text font-bold">FinControl</span>
        </div>
        <button onClick={() => setMobileOpen(!mobileOpen)} className="text-foreground p-1 rounded-lg hover:bg-accent transition-colors">
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-background/80 backdrop-blur-sm animate-fade-in" onClick={() => setMobileOpen(false)}>
          <div className="absolute top-14 left-0 right-0 bg-sidebar/95 backdrop-blur-md border-b border-sidebar-border p-4 flex flex-col gap-1 animate-slide-in" onClick={e => e.stopPropagation()}>
            {links.map(l => (
              <NavLink
                key={l.to}
                to={l.to}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  location.pathname === l.to
                    ? 'bg-primary/10 text-primary border border-primary/20'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
                }`}
              >
                <l.icon size={18} />
                {l.label}
              </NavLink>
            ))}
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 overflow-auto md:pt-0 pt-14">
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
