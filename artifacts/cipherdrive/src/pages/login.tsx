import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLogin } from "@workspace/api-client-react";
import { Shield, Lock, Mail, Loader2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

const loginSchema = z.object({
  email: z.string().email("Invalid coordinates"),
  password: z.string().min(1, "Passcode required"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const loginMutation = useLogin();
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = (data: LoginForm) => {
    loginMutation.mutate({ data }, {
      onSuccess: (res) => {
        localStorage.setItem("cipherdrive_token", res.token);
        toast({
          title: "Access Granted",
          description: `Welcome back, ${res.user.username}. Connection secure.`,
        });
        setLocation("/dashboard");
      },
      onError: (err: unknown) => {
        const msg = err instanceof Error ? err.message : "Invalid credentials. Incident logged.";
        toast({ title: "Access Denied", description: msg, variant: "destructive" });
      },
    });
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-black relative overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#00d4ff1a_1px,transparent_1px),linear-gradient(to_bottom,#00d4ff1a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-20" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/20 rounded-full blur-[120px] pointer-events-none mix-blend-screen" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md p-8 mx-4 bg-black/60 backdrop-blur-2xl border border-primary/30 rounded-xl shadow-[0_0_50px_rgba(0,212,255,0.15)]"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center border border-primary/50 shadow-[0_0_20px_rgba(0,212,255,0.4)] mb-4">
            <Shield className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-mono font-bold text-white tracking-widest">CIPHER<span className="text-primary">DRIVE</span></h1>
          <p className="text-primary/70 font-mono text-sm mt-2 uppercase tracking-[0.2em]">Secure Authentication Gateway</p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-muted-foreground font-mono uppercase text-xs">Identifier / Email</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                      <Input
                        placeholder="operator@system.net"
                        className="pl-10 bg-black/50 border-border/50 focus:border-primary/50 focus:ring-primary/50 font-mono text-white placeholder:text-muted-foreground/50"
                        {...field}
                      />
                    </div>
                  </FormControl>
                  <FormMessage className="font-mono text-xs text-destructive" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-muted-foreground font-mono uppercase text-xs">Passcode / Key</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        className="pl-10 pr-10 bg-black/50 border-border/50 focus:border-primary/50 focus:ring-primary/50 font-mono text-white placeholder:text-muted-foreground/50"
                        {...field}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                        tabIndex={-1}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage className="font-mono text-xs text-destructive" />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="w-full font-mono uppercase tracking-widest bg-primary hover:bg-primary/90 text-black font-bold h-12 shadow-[0_0_20px_rgba(0,212,255,0.4)] hover:shadow-[0_0_30px_rgba(0,212,255,0.6)] transition-all"
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? (
                <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Authenticating...</>
              ) : (
                "Initialize Connection"
              )}
            </Button>
          </form>
        </Form>

        <div className="mt-8 text-center border-t border-border/50 pt-6">
          <p className="text-muted-foreground font-mono text-sm">
            Unregistered operator?{" "}
            <Link href="/register" className="text-primary hover:text-primary/80 hover:underline underline-offset-4 transition-colors">
              Request access
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
