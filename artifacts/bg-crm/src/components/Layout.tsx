import { Link, useLocation } from "wouter";
import { Menu, X, Sun, Moon } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/context/ThemeContext";

const navItems = [
  { href: "/", label: "Dashboard" },
  { href: "/players", label: "Players" },
  { href: "/fitness", label: "Fitness Tests" },
  { href: "/analytics", label: "Analytics" },
];

const logoSrc = `${import.meta.env.BASE_URL}bg-logo.png`.replace(/\/\//g, "/");

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  const NavLink = ({ href, label, onClick }: { href: string; label: string; onClick?: () => void }) => {
    const active = location === href || (href !== "/" && location.startsWith(href));
    return (
      <Link
        href={href}
        onClick={onClick}
        data-testid={`nav-${label.toLowerCase().replace(/\s/g, "-")}`}
        className={cn(
          "block px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 border",
          active
            ? isDark
              ? "bg-indigo-600/20 text-indigo-300 nav-glow border-indigo-500/20"
              : "bg-indigo-50 text-indigo-700 border-indigo-200"
            : isDark
              ? "text-slate-400 hover:bg-white/5 hover:text-slate-100 border-transparent"
              : "text-slate-500 hover:bg-slate-100 hover:text-slate-800 border-transparent"
        )}
      >
        {label}
      </Link>
    );
  };

  const ThemeToggle = () => (
    <button
      onClick={toggleTheme}
      data-testid="theme-toggle"
      className={cn(
        "w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-150 shrink-0",
        isDark
          ? "bg-white/6 text-slate-400 hover:bg-white/10 hover:text-slate-200"
          : "bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700"
      )}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {isDark ? <Sun size={14} /> : <Moon size={14} />}
    </button>
  );

  const SidebarContent = ({ onNav }: { onNav?: () => void }) => (
    <div className="flex flex-col h-full">
      {/* Logo area */}
      <div className="px-4 pt-5 pb-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src={logoSrc}
              alt="Bombay Gymkhana"
              className={cn(
                "w-10 h-10 object-contain shrink-0",
                !isDark && "brightness-75"
              )}
            />
            <div className="min-w-0">
              <div className={cn("text-[10px] font-semibold uppercase tracking-[0.14em] truncate", isDark ? "text-slate-500" : "text-slate-400")}>
                Bombay Gymkhana
              </div>
              <div className={cn("text-sm font-bold leading-tight truncate", isDark ? "text-white" : "text-slate-900")}>
                Women's Football
              </div>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </div>

      <div className={cn("mx-5 mb-4 h-px", isDark ? "bg-white/6" : "bg-slate-200")} />

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-0.5">
        <p className={cn("px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em]", isDark ? "text-slate-600" : "text-slate-400")}>
          Menu
        </p>
        {navItems.map((item) => <NavLink key={item.href} {...item} onClick={onNav} />)}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4">
        <div className={cn("h-px mb-3", isDark ? "bg-white/6" : "bg-slate-200")} />
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
      <aside className={cn(
        "hidden lg:flex flex-col w-56 flex-shrink-0 border-r sticky top-0 h-screen bg-sidebar",
        isDark ? "border-white/[0.06]" : "border-slate-200"
      )}>
        <SidebarContent />
      </aside>

      {/* Mobile header */}
      <div className={cn(
        "lg:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 h-14 border-b bg-sidebar",
        isDark ? "border-white/[0.06]" : "border-slate-200"
      )}>
        <div className="flex items-center gap-2.5">
          <img
            src={logoSrc}
            alt="Bombay Gymkhana"
            className={cn("w-8 h-8 object-contain", !isDark && "brightness-75")}
          />
          <span className={cn("text-sm font-bold", isDark ? "text-white" : "text-slate-900")}>
            Women's Football
          </span>
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
        <div className="lg:hidden fixed inset-0 z-30 bg-black/50 backdrop-blur-sm" onClick={() => setMobileOpen(false)}>
          <div
            className={cn("absolute left-0 top-14 bottom-0 w-56 bg-sidebar border-r", isDark ? "border-white/[0.06]" : "border-slate-200")}
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
