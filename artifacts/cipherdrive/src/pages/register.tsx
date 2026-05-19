import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRegister } from "@workspace/api-client-react";
import { Shield, Lock, Mail, User, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { Progress } from "@/components/ui/progress";

const registerSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Invalid email coordinate"),
  password: z.string().min(8, "Passcode must be at least 8 characters"),
});

type RegisterForm = z.infer<typeof registerSchema>;

export default function Register() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const registerMutation = useRegister();
  const [passwordStrength, setPasswordStrength] = useState(0);

  const form = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
    },
  });

  const watchPassword = form.watch("password");

  // Calculate password strength
  useState(() => {
    let strength = 0;
    if (watchPassword.length > 7) strength += 25;
    if (watchPassword.match(/[a-z]+/)) strength += 25;
    if (watchPassword.match(/[A-Z]+/)) strength += 25;
    if (watchPassword.match(/[0-9]+/) || watchPassword.match(/[^a-zA-Z0-9]+/)) strength += 25;
    setPasswordStrength(strength);
  }, [watchPassword]);

  const onSubmit = (data: RegisterForm) => {
    registerMutation.mutate({ data }, {
      onSuccess: (res) => {
        localStorage.setItem("cipherdrive_token", res.token);
        toast({
          title: "Registration Complete",
          description: `Welcome to CipherDrive, ${res.user.username}.`,
        });
        setLocation("/dashboard");
      },
      onError: (err: any) => {
        toast({
          title: "Registration Failed",
          description: err.message || "Could not establish secure identity.",
          variant: "destructive",
        });
      }
    });
  };

  const getStrengthColor = () => {
    if (passwordStrength < 50) return "bg-destructive";
    if (passwordStrength < 75) return "bg-yellow-500";
    if (passwordStrength < 100) return "bg-primary";
    return "bg-accent";
  };

  const getStrengthText = () => {
    if (watchPassword.length === 0) return "Awaiting input";
    if (passwordStrength < 50) return "Weak";
    if (passwordStrength < 75) return "Moderate";
    if (passwordStrength < 100) return "Strong";
    return "Maximum Security";
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-black relative overflow-hidden">
      {/* Background Matrix/Grid effects */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#00d4ff1a_1px,transparent_1px),linear-gradient(to_bottom,#00d4ff1a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-20"></div>
      
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-secondary/20 rounded-full blur-[120px] pointer-events-none mix-blend-screen"></div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md p-8 bg-black/60 backdrop-blur-2xl border border-secondary/30 rounded-xl shadow-[0_0_50px_rgba(123,47,255,0.15)]"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-secondary/10 rounded-2xl flex items-center justify-center border border-secondary/50 shadow-[0_0_20px_rgba(123,47,255,0.4)] mb-4">
            <Shield className="w-8 h-8 text-secondary" />
          </div>
          <h1 className="text-3xl font-mono font-bold text-white tracking-widest">CIPHER<span className="text-secondary">DRIVE</span></h1>
          <p className="text-secondary/70 font-mono text-sm mt-2 uppercase tracking-[0.2em]">Operator Registration</p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-muted-foreground font-mono uppercase text-xs">Alias / Callsign</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input 
                        placeholder="Neo" 
                        className="pl-10 bg-black/50 border-border/50 focus:border-secondary/50 focus:ring-secondary/50 font-mono text-white placeholder:text-muted-foreground/50" 
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
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-muted-foreground font-mono uppercase text-xs">Secure Comm Link</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input 
                        placeholder="operator@system.net" 
                        className="pl-10 bg-black/50 border-border/50 focus:border-secondary/50 focus:ring-secondary/50 font-mono text-white placeholder:text-muted-foreground/50" 
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
                  <FormLabel className="text-muted-foreground font-mono uppercase text-xs">Encryption Key</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input 
                        type="password" 
                        placeholder="••••••••" 
                        className="pl-10 bg-black/50 border-border/50 focus:border-secondary/50 focus:ring-secondary/50 font-mono text-white placeholder:text-muted-foreground/50" 
                        {...field} 
                        onChange={(e) => {
                          field.onChange(e);
                          let strength = 0;
                          const val = e.target.value;
                          if (val.length > 7) strength += 25;
                          if (val.match(/[a-z]+/)) strength += 25;
                          if (val.match(/[A-Z]+/)) strength += 25;
                          if (val.match(/[0-9]+/) || val.match(/[^a-zA-Z0-9]+/)) strength += 25;
                          setPasswordStrength(strength);
                        }}
                      />
                    </div>
                  </FormControl>
                  <div className="mt-2 space-y-1">
                    <div className="flex justify-between items-center text-xs font-mono">
                      <span className="text-muted-foreground uppercase">Key Strength</span>
                      <span className={cn(
                        passwordStrength < 50 ? "text-destructive" :
                        passwordStrength < 75 ? "text-yellow-500" :
                        passwordStrength < 100 ? "text-primary" : "text-accent"
                      )}>{getStrengthText()}</span>
                    </div>
                    <Progress value={passwordStrength} className="h-1 bg-muted" indicatorClassName={getStrengthColor()} />
                  </div>
                  <FormMessage className="font-mono text-xs text-destructive" />
                </FormItem>
              )}
            />

            <Button 
              type="submit" 
              className="w-full font-mono uppercase tracking-widest bg-secondary hover:bg-secondary/90 text-white font-bold h-12 shadow-[0_0_20px_rgba(123,47,255,0.4)] hover:shadow-[0_0_30px_rgba(123,47,255,0.6)] transition-all mt-4"
              disabled={registerMutation.isPending}
            >
              {registerMutation.isPending ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Generating Keys...
                </>
              ) : (
                "Establish Identity"
              )}
            </Button>
          </form>
        </Form>

        <div className="mt-8 text-center border-t border-border/50 pt-6">
          <p className="text-muted-foreground font-mono text-sm">
            Known operator?{" "}
            <Link href="/login" className="text-secondary hover:text-secondary/80 hover:underline underline-offset-4 transition-colors">
              Access gateway
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
