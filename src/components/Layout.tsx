import { Link, useLocation } from "wouter";
import { ChevronDown, Sun, Moon, LayoutDashboard, Users, BarChart2 } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/context/ThemeContext";

const navItems = [
  { href: "/",          label: "Events",       icon: LayoutDashboard },
  { href: "/athletes",  label: "Athletes",     icon: Users           },
  { href: "/analytics", label: "Analytics",    icon: BarChart2       },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentLabel = navItems.find(
    (item) => location === item.href || (item.href !== "/" && location.startsWith(item.href))
  )?.label ?? "Events";

  useEffect(() => {
    if (!mobileOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setMobileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [mobileOpen]);

  const NavLink = ({
    href,
    label,
    icon: Icon,
    onClick,
  }: {
    href: string;
    label: string;
    icon?: React.ComponentType<{ size?: number; className?: string }>;
    onClick?: () => void;
  }) => {
    const active = location === href || (href !== "/" && location.startsWith(href));
    return (
      <Link
        href={href}
        onClick={onClick}
        data-testid={`nav-${label.toLowerCase().replace(/\s/g, "-")}`}
        className={cn(
          "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 border",
          active
            ? "bg-primary/10 text-primary border-primary/20"
            : "text-muted-foreground hover:bg-muted hover:text-foreground border-transparent"
        )}
      >
        {Icon && <Icon size={14} className="shrink-0" />}
        {label}
      </Link>
    );
  };

  const ThemeToggle = () => (
    <button
      onClick={toggleTheme}
      data-testid="theme-toggle"
      className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-150 shrink-0 bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {isDark ? <Sun size={14} /> : <Moon size={14} />}
    </button>
  );

  const SidebarContent = ({ onNav }: { onNav?: () => void }) => (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-5 pb-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Reliance Foundation
              </div>
              <div className="text-base font-medium leading-tight truncate text-foreground">
                Athletics <span className="text-primary">CRM</span>
              </div>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </div>

      <div className="mx-5 mb-4 h-px bg-border" />

      <nav className="flex-1 px-3 space-y-0.5">
        <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Menu
        </p>
        {navItems.map((item) => <NavLink key={item.href} {...item} onClick={onNav} />)}
      </nav>

      <div className="px-5 py-4">
        <div className="h-px mb-3 bg-border" />
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          <span className="text-[11px] text-muted-foreground">RF Athletics CRM · v1.0</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen">
      <aside className="hidden lg:flex flex-col w-56 flex-shrink-0 border-r sticky top-0 h-screen bg-sidebar border-sidebar-border">
        <SidebarContent />
      </aside>

      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 h-12 border-b bg-sidebar border-sidebar-border">
        <div className="relative" ref={dropdownRef}>
          <button
            data-testid="mobile-menu-toggle"
            onClick={() => setMobileOpen(!mobileOpen)}
            className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-sm font-semibold transition-colors text-foreground hover:bg-muted"
          >
            {currentLabel}
            <ChevronDown size={14} className={cn("transition-transform", mobileOpen && "rotate-180")} />
          </button>

          {mobileOpen && (
            <div className="absolute left-0 top-full mt-1 w-48 rounded-lg border shadow-lg py-1 z-50 bg-popover border-popover-border">
              {navItems.map((item) => (
                <NavLink key={item.href} {...item} onClick={() => setMobileOpen(false)} />
              ))}
            </div>
          )}
        </div>

        <ThemeToggle />
      </div>

      <main className="flex-1 min-w-0 lg:pt-0 pt-12">
        <div className="max-w-[1440px] mx-auto px-5 sm:px-8 py-7">
          {children}
        </div>
      </main>
    </div>
  );
}
