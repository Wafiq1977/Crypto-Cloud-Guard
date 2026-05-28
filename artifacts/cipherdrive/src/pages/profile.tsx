import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { getGetCurrentUserQueryKey } from "@workspace/api-client-react";
import { formatBytes, formatDate } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Shield, HardDrive, Key, Camera, Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export default function Profile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [avatarKey, setAvatarKey] = useState(0); // bumped to bust browser cache

  if (!user) return null;

  const storagePercentage = (user.storageUsed / user.storageQuota) * 100;
  const initials = user.username.slice(0, 2).toUpperCase();
  const avatarSrc = user.avatarUrl
    ? `${user.avatarUrl}?v=${avatarKey}`
    : null;

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset the input so the same file can be re-selected
    e.target.value = "";

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("avatar", file);

      const token = localStorage.getItem("cipherdrive_token");
      const res = await fetch("/api/auth/avatar", {
        method: "POST",
        headers: { Authorization: `Bearer ${token ?? ""}` },
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? "Upload failed");
      }

      setAvatarKey((k) => k + 1);
      queryClient.invalidateQueries({ queryKey: getGetCurrentUserQueryKey() });
      toast({ title: "Avatar Updated", description: "Profile photo saved." });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not upload photo.";
      toast({ title: "Upload Failed", description: msg, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3 border-b border-border/50 pb-4 mb-8">
        <div className="w-10 h-10 bg-secondary/10 rounded flex items-center justify-center border border-secondary/30">
          <User className="w-5 h-5 text-secondary" />
        </div>
        <div>
          <h1 className="text-2xl font-mono font-bold tracking-widest text-white">OPERATOR PROFILE</h1>
          <p className="text-secondary/70 font-mono text-sm uppercase tracking-wider">Identity and quotas</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* ── Identity card ── */}
        <Card className="md:col-span-1 bg-black/40 border-border/50 backdrop-blur-md">
          <CardContent className="p-6 flex flex-col items-center text-center">
            {/* Avatar area */}
            <div className="relative group mb-4">
              <div
                className="w-24 h-24 rounded-full overflow-hidden border-2 border-secondary/40 shadow-[0_0_20px_rgba(123,47,255,0.25)] cursor-pointer select-none"
                onClick={() => !uploading && fileInputRef.current?.click()}
                title="Click to change photo"
              >
                {avatarSrc ? (
                  <img
                    src={avatarSrc}
                    alt={user.username}
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                  />
                ) : (
                  <div className="w-full h-full bg-secondary/10 flex items-center justify-center">
                    <Shield className="w-10 h-10 text-secondary" />
                  </div>
                )}
              </div>

              {/* Initials badge when no avatar */}
              {!avatarSrc && (
                <div className="absolute inset-0 rounded-full flex items-center justify-center pointer-events-none">
                  <span className="text-2xl font-mono font-bold text-secondary/70">{initials}</span>
                </div>
              )}

              {/* Camera overlay on hover / upload spinner */}
              <div
                className="absolute inset-0 rounded-full flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                onClick={() => !uploading && fileInputRef.current?.click()}
              >
                {uploading ? (
                  <Loader2 className="w-7 h-7 text-white animate-spin" />
                ) : (
                  <Camera className="w-7 h-7 text-white" />
                )}
              </div>
            </div>

            <p className="text-[10px] font-mono text-muted-foreground mb-3 uppercase tracking-wider">
              {uploading ? "Uploading…" : "Click photo to change"}
            </p>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              className="hidden"
              onChange={handleAvatarChange}
              disabled={uploading}
            />

            <h2 className="text-xl font-mono font-bold text-white mb-1">{user.username}</h2>
            <p className="text-sm font-mono text-muted-foreground">{user.email}</p>

            <div className="w-full mt-6 pt-6 border-t border-border/30 text-left space-y-3">
              <div>
                <p className="text-xs font-mono text-muted-foreground uppercase">Access Level</p>
                <p className="text-sm font-mono text-white">Standard Operator</p>
              </div>
              <div>
                <p className="text-xs font-mono text-muted-foreground uppercase">Clearance Date</p>
                <p className="text-sm font-mono text-white">{formatDate(user.createdAt)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Right column ── */}
        <div className="md:col-span-2 space-y-6">
          <Card className="bg-black/40 border-border/50 backdrop-blur-md">
            <CardHeader>
              <CardTitle className="font-mono text-lg flex items-center gap-2 text-white">
                <HardDrive className="w-5 h-5 text-primary" />
                Storage Quota
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-end mb-2 font-mono">
                <div>
                  <p className="text-3xl font-bold text-white">{formatBytes(user.storageUsed)}</p>
                  <p className="text-xs text-muted-foreground uppercase mt-1">Allocated Space</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-primary">{formatBytes(user.storageQuota)}</p>
                  <p className="text-xs text-muted-foreground uppercase">Maximum Capacity</p>
                </div>
              </div>
              <Progress
                value={storagePercentage}
                className="h-2 mt-4 bg-muted"
                indicatorClassName="bg-primary shadow-[0_0_10px_rgba(0,212,255,0.5)]"
              />
              <p className="text-xs font-mono text-muted-foreground text-right mt-2">{storagePercentage.toFixed(1)}% Utilized</p>
            </CardContent>
          </Card>

          <Card className="bg-black/40 border-border/50 backdrop-blur-md">
            <CardHeader>
              <CardTitle className="font-mono text-lg flex items-center gap-2 text-white">
                <Key className="w-5 h-5 text-accent" />
                Security Credentials
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm font-mono text-muted-foreground mb-6">
                Identity passcode changes require re-authentication across all active terminals.
              </p>
              <Button variant="outline" className="font-mono border-border hover:bg-white/5 w-full md:w-auto">
                Rotate Passcode
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
