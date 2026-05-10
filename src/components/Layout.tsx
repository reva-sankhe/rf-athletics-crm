import { Link, useLocation } from "wouter";
import { ChevronDown, ChevronLeft, ChevronRight, Sun, Moon, LayoutDashboard, Users, BarChart2 } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/context/ThemeContext";

const navItems = [
  { href: "/analytics", label: "Analytics", icon: BarChart2       },
  { href: "/events",    label: "Events",    icon: LayoutDashboard },
  { href: "/athletes",  label: "Athletes",  icon: Users           },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentLabel = navItems.find(
    (item) => location === item.href || location.startsWith(item.href + "/")
  )?.label ?? "Analytics";

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
    const active = location === href || location.startsWith(href + "/");
    return (
      <Link
        href={href}
        onClick={onClick}
        title={collapsed ? label : undefined}
        data-testid={`nav-${label.toLowerCase().replace(/\s/g, "-")}`}
        className={cn(
          "flex items-center gap-2.5 py-2 rounded-lg text-sm font-medium transition-all duration-150 border",
          collapsed ? "justify-center px-2" : "px-3",
          active
            ? "bg-primary/10 text-primary border-primary/20"
            : "text-muted-foreground hover:bg-muted hover:text-foreground border-transparent"
        )}
      >
        {Icon && <Icon size={14} className="shrink-0" />}
        {!collapsed && label}
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
      {/* Logo */}
      <div className={cn("pt-5 pb-4 flex items-center", collapsed ? "px-2 justify-center" : "px-4")}>
        {collapsed ? (
          <div className="w-8 h-8 rounded bg-white flex items-center justify-center">
            <img src="/rf-logo.png" alt="RF" className="w-7 h-7 object-contain" />
          </div>
        ) : (
          <img
            src="/rf-logo.png"
            alt="Reliance Foundation"
            className="h-12 w-auto object-contain rounded bg-white px-1"
          />
        )}
      </div>

      <div className="mx-3 mb-4 h-px bg-border" />

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-0.5">
        {!collapsed && (
          <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Menu
          </p>
        )}
        {navItems.map((item) => <NavLink key={item.href} {...item} onClick={onNav} />)}
      </nav>

      {/* Bottom: theme toggle + collapse button */}
      <div className={cn("py-4", collapsed ? "px-2" : "px-3")}>
        <div className="h-px mb-3 bg-border" />
        <div className={cn("flex items-center gap-2", collapsed ? "flex-col" : "justify-between")}>
          <ThemeToggle />
          <button
            onClick={() => setCollapsed(v => !v)}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-150 shrink-0 bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen">
      <aside
        className={cn(
          "hidden lg:flex flex-col flex-shrink-0 border-r sticky top-0 h-screen bg-sidebar border-sidebar-border transition-all duration-200",
          collapsed ? "w-14" : "w-56"
        )}
      >
        <SidebarContent />
      </aside>

      {/* Mobile top bar */}
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
