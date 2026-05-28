import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { getGetCurrentUserQueryKey } from "@workspace/api-client-react";
import { formatBytes, formatDate } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Shield, HardDrive, Key, Camera, Loader2, Pencil, Trash2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export default function Profile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  // bump this to force <img> to re-fetch after upload/delete
  const [imgVersion, setImgVersion] = useState(Date.now());

  if (!user) return null;

  const storagePercentage = (user.storageUsed / user.storageQuota) * 100;
  const initials = user.username.slice(0, 2).toUpperCase();
  // avatarUrl is already the public URL: /api/auth/avatar/<id>
  const avatarSrc = user.avatarUrl ? `${user.avatarUrl}?v=${imgVersion}` : null;
  const isBusy = uploading || deleting;

  const invalidateUser = () => {
    queryClient.invalidateQueries({ queryKey: getGetCurrentUserQueryKey() });
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
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

      setImgVersion(Date.now());
      invalidateUser();
      toast({ title: "Photo Updated", description: "Profile photo saved successfully." });
    } catch (err) {
      toast({
        title: "Upload Failed",
        description: err instanceof Error ? err.message : "Could not upload photo.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteAvatar = async () => {
    if (!confirm("Remove your profile photo?")) return;
    setDeleting(true);
    try {
      const token = localStorage.getItem("cipherdrive_token");
      const res = await fetch("/api/auth/avatar", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token ?? ""}` },
      });
      if (!res.ok) throw new Error("Failed to remove photo");
      invalidateUser();
      toast({ title: "Photo Removed", description: "Profile photo has been deleted." });
    } catch {
      toast({ title: "Error", description: "Could not remove photo.", variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* ── Page header ── */}
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

            {/* Avatar with hover overlay */}
            <div className="relative group mb-2">
              <div
                className="w-24 h-24 rounded-full overflow-hidden border-2 border-secondary/40 shadow-[0_0_20px_rgba(123,47,255,0.25)] cursor-pointer select-none"
                onClick={() => !isBusy && fileInputRef.current?.click()}
                title="Click to change photo"
              >
                {avatarSrc ? (
                  <img
                    key={imgVersion}
                    src={avatarSrc}
                    alt={user.username}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-secondary/10 flex items-center justify-center">
                    <span className="text-2xl font-mono font-bold text-secondary/70">{initials}</span>
                  </div>
                )}
              </div>

              {/* Shield icon subtle background when no avatar */}
              {!avatarSrc && (
                <div className="absolute inset-0 rounded-full flex items-center justify-center pointer-events-none opacity-20">
                  <Shield className="w-10 h-10 text-secondary" />
                </div>
              )}

              {/* Camera overlay on hover */}
              <div
                className="absolute inset-0 rounded-full flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                onClick={() => !isBusy && fileInputRef.current?.click()}
              >
                {uploading ? (
                  <Loader2 className="w-7 h-7 text-white animate-spin" />
                ) : (
                  <Camera className="w-7 h-7 text-white" />
                )}
              </div>
            </div>

            {/* Edit / Delete action buttons */}
            <div className="flex items-center gap-2 mb-4">
              <button
                type="button"
                disabled={isBusy}
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1 text-[11px] font-mono text-primary/70 hover:text-primary transition-colors disabled:opacity-40"
                title="Change photo"
              >
                {uploading ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Pencil className="w-3 h-3" />
                )}
                Edit
              </button>

              {avatarSrc && (
                <>
                  <span className="text-border/60 text-xs">|</span>
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={handleDeleteAvatar}
                    className="flex items-center gap-1 text-[11px] font-mono text-destructive/70 hover:text-destructive transition-colors disabled:opacity-40"
                    title="Remove photo"
                  >
                    {deleting ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Trash2 className="w-3 h-3" />
                    )}
                    Remove
                  </button>
                </>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              className="hidden"
              onChange={handleAvatarChange}
              disabled={isBusy}
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
              <p className="text-xs font-mono text-muted-foreground text-right mt-2">
                {storagePercentage.toFixed(1)}% Utilized
              </p>
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
