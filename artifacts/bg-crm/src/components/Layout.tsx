import { Link, useLocation } from "wouter";
import { LayoutDashboard, Users, Dumbbell, BarChart3, Menu, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/players", label: "Players", icon: Users },
  { href: "/fitness", label: "Fitness Tests", icon: Dumbbell },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const NavLink = ({ href, label, icon: Icon, onClick }: { href: string; label: string; icon: React.ElementType; onClick?: () => void }) => {
    const active = location === href || (href !== "/" && location.startsWith(href));
    return (
      <Link
        href={href}
        onClick={onClick}
        data-testid={`nav-${label.toLowerCase().replace(/\s/g, "-")}`}
        className={cn(
          "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
          active
            ? "bg-primary/15 text-primary"
            : "text-muted-foreground hover:bg-accent hover:text-foreground"
        )}
      >
        <Icon size={16} />
        {label}
      </Link>
    );
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar — desktop */}
      <aside className="hidden lg:flex flex-col w-56 border-r border-border bg-sidebar flex-shrink-0">
        <div className="px-5 py-5 border-b border-border">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-0.5">Bombay Gymkhana</div>
          <div className="text-sm font-semibold text-foreground leading-tight">Women's Football</div>
        </div>
        <nav className="flex-1 px-2 py-4 space-y-0.5">
          {navItems.map((item) => <NavLink key={item.href} {...item} />)}
        </nav>
        <div className="px-4 py-3 border-t border-border">
          <div className="text-xs text-muted-foreground">BG CRM v1.0</div>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-30 flex items-center justify-between px-4 h-14 border-b border-border bg-sidebar">
        <div>
          <div className="text-xs text-muted-foreground">Bombay Gymkhana</div>
          <div className="text-sm font-semibold text-foreground">Women's Football</div>
        </div>
        <button
          data-testid="mobile-menu-toggle"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="text-muted-foreground hover:text-foreground p-1"
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-20 bg-background/80 backdrop-blur-sm" onClick={() => setMobileOpen(false)}>
          <div className="absolute left-0 top-14 bottom-0 w-56 bg-sidebar border-r border-border" onClick={(e) => e.stopPropagation()}>
            <nav className="px-2 py-4 space-y-0.5">
              {navItems.map((item) => <NavLink key={item.href} {...item} onClick={() => setMobileOpen(false)} />)}
            </nav>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 min-w-0 lg:pt-0 pt-14">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6">
          {children}
        </div>
      </main>
    </div>
  );
}
