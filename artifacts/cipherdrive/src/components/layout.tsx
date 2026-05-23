import { ReactNode, useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import {
  Shield, LayoutDashboard, FolderLock, LockKeyhole, Unlock,
  History, User, LogOut, Menu, X,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useLogout } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { motion, AnimatePresence } from "framer-motion";

interface LayoutProps {
  children: ReactNode;
}

const NAV_ITEMS = [
  { href: "/dashboard",  label: "Dashboard",    icon: LayoutDashboard },
  { href: "/files",      label: "Secure Vault",  icon: FolderLock },
  { href: "/encrypt",    label: "Encrypt",       icon: LockKeyhole },
  { href: "/decrypt",    label: "Decrypt",       icon: Unlock },
  { href: "/history",    label: "Activity Log",  icon: History },
];

function SidebarContent({
  location,
  user,
  onNav,
  onLogout,
}: {
  location: string;
  user: { username?: string } | null;
  onNav: () => void;
  onLogout: () => void;
}) {
  return (
    <>
      {/* Logo */}
      <div className="p-5 flex items-center gap-3 border-b border-border/50 flex-shrink-0">
        <div className="w-9 h-9 bg-primary/20 rounded-lg flex items-center justify-center border border-primary/50 shadow-[0_0_15px_rgba(0,212,255,0.3)]">
          <Shield className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="font-mono font-bold text-base tracking-wider text-white leading-none">
            CIPHER<span className="text-primary">DRIVE</span>
          </h1>
          <p className="text-[9px] font-mono text-primary/70 tracking-widest uppercase mt-0.5">Secure Data Vault</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-5 px-3 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const isActive = location === item.href;
          return (
            <Link key={item.href} href={item.href} className="block" onClick={onNav}>
              <div
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-md font-mono text-sm transition-all duration-200 group relative",
                  isActive
                    ? "text-primary bg-primary/10 border border-primary/20 shadow-[inset_0_0_20px_rgba(0,212,255,0.05)]"
                    : "text-muted-foreground hover:text-white hover:bg-white/5"
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="active-nav"
                    className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-l-md shadow-[0_0_10px_rgba(0,212,255,0.8)]"
                  />
                )}
                <item.icon className={cn("w-5 h-5 flex-shrink-0", isActive ? "text-primary" : "text-muted-foreground group-hover:text-white")} />
                {item.label}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-border/50 space-y-1 flex-shrink-0">
        <Link href="/profile" className="block" onClick={onNav}>
          <div className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-md font-mono text-sm transition-all duration-200",
            location === "/profile" ? "text-white bg-white/10" : "text-muted-foreground hover:text-white hover:bg-white/5"
          )}>
            <User className="w-5 h-5 flex-shrink-0" />
            <span className="truncate">{user?.username || "Operator"}</span>
          </div>
        </Link>
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md font-mono text-sm text-destructive hover:bg-destructive/10 transition-all duration-200"
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          Terminate Session
        </button>
      </div>
    </>
  );
}

export function Layout({ children }: LayoutProps) {
  const [location, setLocation] = useLocation();
  const { user } = useAuth();
  const logoutMutation = useLogout();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close drawer on route change
  useEffect(() => { setMobileOpen(false); }, [location]);

  // Lock body scroll when drawer open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        localStorage.removeItem("cipherdrive_token");
        setLocation("/login");
      },
    });
  };

  return (
    <div className="min-h-[100dvh] bg-background text-foreground flex font-sans overflow-hidden">

      {/* ─── Desktop Sidebar ─────────────────────────────── */}
      <aside className="hidden md:flex w-64 flex-col border-r border-border bg-black/60 backdrop-blur-xl relative z-10 flex-shrink-0">
        <SidebarContent
          location={location}
          user={user ?? null}
          onNav={() => {}}
          onLogout={handleLogout}
        />
      </aside>

      {/* ─── Mobile Overlay Backdrop ─────────────────────── */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm md:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* ─── Mobile Drawer ───────────────────────────────── */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.aside
            key="drawer"
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "tween", duration: 0.25 }}
            className="fixed top-0 left-0 h-full w-72 max-w-[85vw] z-50 flex flex-col bg-black/95 backdrop-blur-xl border-r border-border/80 md:hidden"
          >
            {/* Close button */}
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-white transition-colors z-10"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>

            <SidebarContent
              location={location}
              user={user ?? null}
              onNav={() => setMobileOpen(false)}
              onLogout={handleLogout}
            />
          </motion.aside>
        )}
      </AnimatePresence>

      {/* ─── Main Content ────────────────────────────────── */}
      <main className="flex-1 relative flex flex-col h-[100dvh] overflow-hidden min-w-0">
        {/* Decorative bg */}
        <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
          <div className="absolute top-0 left-1/4 w-[1px] h-full bg-gradient-to-b from-transparent via-primary/5 to-transparent" />
          <div className="absolute top-0 right-1/4 w-[1px] h-full bg-gradient-to-b from-transparent via-primary/5 to-transparent" />
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary/10 rounded-full blur-[100px]" />
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-secondary/10 rounded-full blur-[100px]" />
        </div>

        {/* ─── Mobile Top Bar ─── */}
        <header className="md:hidden flex items-center gap-3 px-4 h-14 border-b border-border/50 bg-black/60 backdrop-blur-xl relative z-10 flex-shrink-0">
          <button
            onClick={() => setMobileOpen(true)}
            className="text-muted-foreground hover:text-white transition-colors p-1"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-primary/20 rounded flex items-center justify-center border border-primary/50">
              <Shield className="w-4 h-4 text-primary" />
            </div>
            <span className="font-mono font-bold text-sm tracking-wider text-white">
              CIPHER<span className="text-primary">DRIVE</span>
            </span>
          </div>
          {/* Current page label on mobile */}
          <span className="ml-auto text-[10px] font-mono text-primary/70 uppercase tracking-widest truncate max-w-[120px]">
            {NAV_ITEMS.find((n) => n.href === location)?.label ?? ""}
          </span>
        </header>

        {/* Page content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 z-10">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
