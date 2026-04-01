import { Link, useLocation } from "wouter";
import { LayoutDashboard, Users, Dumbbell, BarChart3, Menu, X, Zap, Sun, Moon } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/context/ThemeContext";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/players", label: "Players", icon: Users },
  { href: "/fitness", label: "Fitness Tests", icon: Dumbbell },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  const NavLink = ({ href, label, icon: Icon, onClick }: { href: string; label: string; icon: React.ElementType; onClick?: () => void }) => {
    const active = location === href || (href !== "/" && location.startsWith(href));
    return (
      <Link
        href={href}
        onClick={onClick}
        data-testid={`nav-${label.toLowerCase().replace(/\s/g, "-")}`}
        className={cn(
          "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 border",
          active
            ? isDark
              ? "bg-violet-600/20 text-violet-300 nav-glow border-violet-500/20"
              : "bg-violet-100 text-violet-700 border-violet-200"
            : isDark
              ? "text-slate-400 hover:bg-white/5 hover:text-slate-200 border-transparent"
              : "text-slate-500 hover:bg-slate-100 hover:text-slate-700 border-transparent"
        )}
      >
        <Icon size={16} className={active ? (isDark ? "text-violet-400" : "text-violet-600") : ""} />
        {label}
      </Link>
    );
  };

  const ThemeToggle = () => (
    <button
      onClick={toggleTheme}
      data-testid="theme-toggle"
      className={cn(
        "w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200",
        isDark
          ? "bg-white/8 text-slate-400 hover:bg-white/12 hover:text-slate-200"
          : "bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700"
      )}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {isDark ? <Sun size={15} /> : <Moon size={15} />}
    </button>
  );

  const SidebarContent = ({ onNav }: { onNav?: () => void }) => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 py-6">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-900/30">
              <Zap size={14} className="text-white" />
            </div>
            <div>
              <div className={cn("text-[10px] font-semibold uppercase tracking-[0.12em]", isDark ? "text-slate-500" : "text-slate-400")}>
                Bombay Gymkhana
              </div>
              <div className={cn("text-sm font-semibold leading-tight", isDark ? "text-slate-100" : "text-slate-800")}>
                Women's Football
              </div>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </div>

      {/* Divider */}
      <div className={cn("mx-4 mb-3 h-px", isDark ? "bg-gradient-to-r from-transparent via-white/8 to-transparent" : "bg-gradient-to-r from-transparent via-slate-200 to-transparent")} />

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-1">
        <p className={cn("px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.12em]", isDark ? "text-slate-600" : "text-slate-400")}>
          Navigation
        </p>
        {navItems.map((item) => <NavLink key={item.href} {...item} onClick={onNav} />)}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4">
        <div className={cn("h-px mb-3", isDark ? "bg-gradient-to-r from-transparent via-white/8 to-transparent" : "bg-gradient-to-r from-transparent via-slate-200 to-transparent")} />
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className={cn("text-[11px]", isDark ? "text-slate-600" : "text-slate-400")}>BG CRM · v1.0</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen">
      {/* Sidebar — desktop */}
      <aside className={cn("hidden lg:flex flex-col w-60 flex-shrink-0 border-r sticky top-0 h-screen bg-sidebar", isDark ? "border-white/[0.06]" : "border-slate-200")}>
        <SidebarContent />
      </aside>

      {/* Mobile header */}
      <div className={cn("lg:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 h-14 border-b bg-sidebar", isDark ? "border-white/[0.06]" : "border-slate-200")}>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
            <Zap size={12} className="text-white" />
          </div>
          <span className={cn("text-sm font-semibold", isDark ? "text-slate-100" : "text-slate-800")}>BG Women's Football</span>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button
            data-testid="mobile-menu-toggle"
            onClick={() => setMobileOpen(!mobileOpen)}
            className={cn("p-1.5 rounded-lg transition-colors", isDark ? "text-slate-400 hover:text-slate-200 hover:bg-white/8" : "text-slate-500 hover:text-slate-700 hover:bg-slate-100")}
          >
            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-30 bg-black/50 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        >
          <div
            className={cn("absolute left-0 top-14 bottom-0 w-60 bg-sidebar border-r", isDark ? "border-white/[0.06]" : "border-slate-200")}
            onClick={(e) => e.stopPropagation()}
          >
            <SidebarContent onNav={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 min-w-0 lg:pt-0 pt-14">
        <div className="max-w-[1440px] mx-auto px-5 sm:px-8 py-7">
          {children}
        </div>
      </main>
    </div>
  );
}
