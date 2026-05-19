import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { Shield, LayoutDashboard, FolderLock, LockKeyhole, Unlock, History, User, LogOut, FileCode2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useLogout } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { motion } from "framer-motion";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [location, setLocation] = useLocation();
  const { user } = useAuth();
  const logoutMutation = useLogout();

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        localStorage.removeItem("cipherdrive_token");
        setLocation("/login");
      }
    });
  };

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/files", label: "Secure Vault", icon: FolderLock },
    { href: "/encrypt", label: "Encrypt", icon: LockKeyhole },
    { href: "/decrypt", label: "Decrypt", icon: Unlock },
    { href: "/history", label: "Activity Log", icon: History },
  ];

  return (
    <div className="min-h-[100dvh] bg-background text-foreground flex font-sans overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-black/60 backdrop-blur-xl flex flex-col relative z-10">
        <div className="p-6 flex items-center gap-3 border-b border-border/50">
          <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center border border-primary/50 shadow-[0_0_15px_rgba(0,212,255,0.3)]">
            <Shield className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="font-mono font-bold text-lg tracking-wider text-white">CIPHER<span className="text-primary">DRIVE</span></h1>
            <p className="text-[10px] font-mono text-primary/70 tracking-widest uppercase">Secure Data Vault</p>
          </div>
        </div>

        <div className="flex-1 py-6 px-4 space-y-2 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location === item.href;
            return (
              <Link key={item.href} href={item.href} className="block">
                <div
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-md font-mono text-sm transition-all duration-200 group relative",
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
                  <item.icon className={cn("w-5 h-5", isActive ? "text-primary" : "text-muted-foreground group-hover:text-white")} />
                  {item.label}
                </div>
              </Link>
            );
          })}
        </div>

        <div className="p-4 border-t border-border/50 space-y-2">
          <Link href="/profile" className="block">
            <div className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-md font-mono text-sm transition-all duration-200",
              location === "/profile" ? "text-white bg-white/10" : "text-muted-foreground hover:text-white hover:bg-white/5"
            )}>
              <User className="w-5 h-5" />
              {user?.username || "Operator"}
            </div>
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-md font-mono text-sm text-destructive hover:bg-destructive/10 hover:text-destructive transition-all duration-200"
          >
            <LogOut className="w-5 h-5" />
            Terminate Session
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 relative flex flex-col h-[100dvh] overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-primary/30 to-transparent"></div>
          <div className="absolute top-0 left-1/4 w-[1px] h-full bg-gradient-to-b from-transparent via-primary/5 to-transparent"></div>
          <div className="absolute top-0 right-1/4 w-[1px] h-full bg-gradient-to-b from-transparent via-primary/5 to-transparent"></div>
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary/10 rounded-full blur-[100px]"></div>
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-secondary/10 rounded-full blur-[100px]"></div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 md:p-8 z-10">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
