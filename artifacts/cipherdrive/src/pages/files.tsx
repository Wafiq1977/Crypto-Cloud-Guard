import { useState } from "react";
import { useLocation } from "wouter";
import {
  useListFiles,
  getListFilesQueryKey,
  useDeleteFile,
  useRenameFile,
  useDecryptFile,
  useEncryptFile,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { formatBytes, formatDate, getAlgorithmColor, cn } from "@/lib/utils";
import { FileUpload } from "@/components/file-upload";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Search, Lock, Unlock, File, MoreVertical, Trash2, Edit2,
  ShieldAlert, Download, Eye, LockKeyhole, ShieldOff, Loader2,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const ALGORITHMS = ["AES-256", "RSA", "HybridAES-RSA", "SHA256", "Caesar", "Vigenere", "RailFence"] as const;
const PRESET_FORMATS = [".enc", ".cipher", ".locked"];

async function triggerFileDownload(fileId: number, open = false) {
  const token = localStorage.getItem("cipherdrive_token");
  const res = await fetch(`/api/files/serve/${fileId}`, {
    headers: { Authorization: `Bearer ${token ?? ""}` },
  });
  if (!res.ok) throw new Error("Download failed");
  const blob = await res.blob();
  const cd = res.headers.get("content-disposition") || "";
  const match = cd.match(/filename="?([^"]+)"?/);
  const filename = match?.[1] ?? `file_${fileId}`;
  const url = URL.createObjectURL(blob);
  if (open) {
    window.open(url, "_blank");
  } else {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export default function Files() {
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [renamingFile, setRenamingFile] = useState<{ id: number; name: string } | null>(null);
  const [decryptDialog, setDecryptDialog] = useState<{ id: number; name: string; algo: string | null } | null>(null);
  const [encryptDialog, setEncryptDialog] = useState<{ id: number; name: string } | null>(null);
  const [decryptKey, setDecryptKey] = useState("");
  const [decryptResult, setDecryptResult] = useState<{ downloadUrl: string; filename: string } | null>(null);
  const [encryptKey, setEncryptKey] = useState("");
  const [encryptAlgo, setEncryptAlgo] = useState<typeof ALGORITHMS[number]>("AES-256");
  const [encryptFormat, setEncryptFormat] = useState(".enc");
  const [downloading, setDownloading] = useState<number | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: files, isLoading } = useListFiles(
    { search: searchTerm || undefined },
    { query: { queryKey: getListFilesQueryKey({ search: searchTerm || undefined }) } }
  );

  const deleteMutation = useDeleteFile();
  const renameMutation = useRenameFile();
  const decryptMutation = useDecryptFile();
  const encryptMutation = useEncryptFile();

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getListFilesQueryKey() });

  const handleDelete = (id: number, name: string) => {
    if (!confirm(`Permanently delete "${name}"? This cannot be undone.`)) return;
    deleteMutation.mutate({ id }, {
      onSuccess: () => { toast({ title: "File Purged", description: "Removed from vault." }); invalidate(); },
      onError: () => toast({ title: "Deletion Failed", variant: "destructive" }),
    });
  };

  const handleRename = () => {
    if (!renamingFile?.name.trim()) return;
    renameMutation.mutate({ id: renamingFile.id, data: { originalName: renamingFile.name } }, {
      onSuccess: () => { toast({ title: "File Renamed" }); setRenamingFile(null); invalidate(); },
      onError: () => toast({ title: "Rename Failed", variant: "destructive" }),
    });
  };

  const handleDownload = async (fileId: number, open = false) => {
    setDownloading(fileId);
    try {
      await triggerFileDownload(fileId, open);
      toast({ title: open ? "File Opened" : "Download Started", description: "Secure transfer initiated." });
    } catch {
      toast({ title: "Download Failed", description: "Could not retrieve file.", variant: "destructive" });
    } finally {
      setDownloading(null);
    }
  };

  const handleDecrypt = () => {
    if (!decryptDialog || !decryptKey.trim()) return;
    decryptMutation.mutate({ id: decryptDialog.id, data: { encryptionKey: decryptKey } }, {
      onSuccess: (res) => {
        toast({ title: "Decryption Complete", description: "Asset unlocked and ready." });
        setDecryptResult({ downloadUrl: res.downloadUrl, filename: res.filename });
        invalidate();
      },
      onError: (err: unknown) => {
        const msg = err instanceof Error ? err.message : "Invalid key or corrupted data.";
        toast({ title: "Decryption Failed", description: msg, variant: "destructive" });
      },
    });
  };

  const handleDecryptDownload = () => {
    if (!decryptResult) return;
    const token = localStorage.getItem("cipherdrive_token");
    const url = decryptResult.downloadUrl.startsWith("/api")
      ? decryptResult.downloadUrl
      : `/api${decryptResult.downloadUrl}`;
    fetch(url, { headers: { Authorization: `Bearer ${token ?? ""}` } })
      .then((r) => r.blob())
      .then((blob) => {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = decryptResult.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        toast({ title: "Download Initiated", description: "Decrypted file saved." });
        setDecryptDialog(null);
        setDecryptKey("");
        setDecryptResult(null);
      })
      .catch(() => toast({ title: "Download Failed", variant: "destructive" }));
  };

  const handleEncrypt = () => {
    if (!encryptDialog || !encryptKey.trim()) return;
    const fmt = encryptFormat.startsWith(".") ? encryptFormat : `.${encryptFormat}`;
    encryptMutation.mutate({
      id: encryptDialog.id,
      data: { algorithm: encryptAlgo, encryptionKey: encryptKey, outputFormat: fmt },
    }, {
      onSuccess: () => {
        toast({ title: "Encryption Complete", description: `Secured with ${encryptAlgo}.` });
        setEncryptDialog(null);
        setEncryptKey("");
        setEncryptAlgo("AES-256");
        setEncryptFormat(".enc");
        invalidate();
      },
      onError: (err: unknown) => {
        const msg = err instanceof Error ? err.message : "Encryption failed.";
        toast({ title: "Encryption Failed", description: msg, variant: "destructive" });
      },
    });
  };

  const closeDecryptDialog = () => {
    setDecryptDialog(null);
    setDecryptKey("");
    setDecryptResult(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between border-b border-border/50 pb-4 gap-4">
        <div>
          <h1 className="text-2xl font-mono font-bold tracking-widest text-white">SECURE VAULT</h1>
          <p className="text-primary/70 font-mono text-sm uppercase tracking-wider">Manage Encrypted Assets</p>
        </div>
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search vault..."
            className="pl-9 bg-black/40 border-border/50 font-mono text-sm focus:border-primary/50"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            data-testid="input-search"
          />
        </div>
      </div>

      <FileUpload className="mb-8" />

      <div className="grid grid-cols-1 gap-3">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !files || files.length === 0 ? (
          <div className="text-center py-16 bg-black/20 rounded-lg border border-border/30 border-dashed">
            <ShieldAlert className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="font-mono text-lg text-white mb-2">Vault Empty</h3>
            <p className="font-mono text-sm text-muted-foreground">Upload files above to begin encryption process.</p>
          </div>
        ) : (
          files.map((file) => {
            const isEncrypted = file.status === "encrypted";
            const isDecrypted = file.status === "decrypted";
            const isUploaded = file.status === "uploaded";

            return (
              <Card
                key={file.id}
                data-testid={`card-file-${file.id}`}
                className="bg-black/40 border-border/50 backdrop-blur-md hover:border-primary/30 transition-colors group"
              >
                <CardContent className="p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    <div className={cn(
                      "w-10 h-10 rounded flex items-center justify-center flex-shrink-0 border",
                      isEncrypted && "bg-primary/10 border-primary/30 text-primary shadow-[0_0_10px_rgba(0,212,255,0.2)]",
                      isDecrypted && "bg-accent/10 border-accent/30 text-accent",
                      isUploaded && "bg-muted/10 border-muted/30 text-muted-foreground",
                    )}>
                      {isEncrypted ? <Lock className="w-5 h-5" /> : isDecrypted ? <Unlock className="w-5 h-5" /> : <File className="w-5 h-5" />}
                    </div>

                    <div className="min-w-0 flex-1">
                      <h4 className="font-mono font-medium text-white truncate">
                        {file.originalName}
                        {file.encryptedName && (
                          <span className="text-muted-foreground ml-2 text-xs">→ {file.encryptedName}</span>
                        )}
                      </h4>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-xs font-mono text-muted-foreground">{formatBytes(file.fileSize)}</span>
                        <span className="text-muted-foreground/40 text-xs">•</span>
                        <span className="text-xs font-mono text-muted-foreground">{formatDate(file.createdAt)}</span>
                        {file.algorithm && (
                          <>
                            <span className="text-muted-foreground/40 text-xs">•</span>
                            <span className={cn("text-[10px] px-1.5 py-0.5 rounded border uppercase tracking-wider font-mono", getAlgorithmColor(file.algorithm))}>
                              {file.algorithm}
                            </span>
                          </>
                        )}
                        {file.outputFormat && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded border border-border/40 text-muted-foreground font-mono">
                            {file.outputFormat}
                          </span>
                        )}
                        <Badge className={cn(
                          "text-[10px] px-1.5 py-0.5 rounded border uppercase tracking-wider font-mono h-auto ml-auto md:ml-0",
                          isEncrypted && "bg-primary/10 text-primary border-primary/30",
                          isDecrypted && "bg-accent/10 text-accent border-accent/30",
                          isUploaded && "bg-gray-500/10 text-gray-400 border-gray-500/30",
                        )}>
                          {file.status}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="flex-shrink-0">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-white"
                          data-testid={`button-menu-${file.id}`}
                        >
                          {downloading === file.id
                            ? <Loader2 className="w-4 h-4 animate-spin" />
                            : <MoreVertical className="w-4 h-4" />}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-black/90 backdrop-blur-xl border-border/50 font-mono w-40">

                        {/* Download */}
                        <DropdownMenuItem
                          onClick={() => handleDownload(file.id, false)}
                          className="hover:bg-white/10 cursor-pointer"
                          data-testid={`action-download-${file.id}`}
                        >
                          <Download className="w-4 h-4 mr-2 text-primary" />
                          Download
                        </DropdownMenuItem>

                        {/* Open */}
                        <DropdownMenuItem
                          onClick={() => handleDownload(file.id, true)}
                          className="hover:bg-white/10 cursor-pointer"
                          data-testid={`action-open-${file.id}`}
                        >
                          <Eye className="w-4 h-4 mr-2 text-muted-foreground" />
                          Open
                        </DropdownMenuItem>

                        <DropdownMenuSeparator className="bg-border/30" />

                        {/* Decrypt — only for encrypted files */}
                        {isEncrypted && (
                          <DropdownMenuItem
                            onClick={() => setDecryptDialog({ id: file.id, name: file.originalName, algo: file.algorithm ?? null })}
                            className="hover:bg-accent/10 text-accent cursor-pointer"
                            data-testid={`action-decrypt-${file.id}`}
                          >
                            <ShieldOff className="w-4 h-4 mr-2" />
                            Decrypt
                          </DropdownMenuItem>
                        )}

                        {/* Encrypt — for uploaded or decrypted files */}
                        {(isUploaded || isDecrypted) && (
                          <DropdownMenuItem
                            onClick={() => setEncryptDialog({ id: file.id, name: file.originalName })}
                            className="hover:bg-primary/10 text-primary cursor-pointer"
                            data-testid={`action-encrypt-${file.id}`}
                          >
                            <LockKeyhole className="w-4 h-4 mr-2" />
                            Encrypt
                          </DropdownMenuItem>
                        )}

                        <DropdownMenuSeparator className="bg-border/30" />

                        {/* Rename */}
                        <DropdownMenuItem
                          onClick={() => setRenamingFile({ id: file.id, name: file.originalName })}
                          className="hover:bg-white/10 cursor-pointer"
                          data-testid={`action-rename-${file.id}`}
                        >
                          <Edit2 className="w-4 h-4 mr-2" />
                          Rename
                        </DropdownMenuItem>

                        {/* Delete */}
                        <DropdownMenuItem
                          onClick={() => handleDelete(file.id, file.originalName)}
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive cursor-pointer"
                          data-testid={`action-delete-${file.id}`}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* ── Rename Dialog ── */}
      <Dialog open={!!renamingFile} onOpenChange={(open) => !open && setRenamingFile(null)}>
        <DialogContent className="bg-black/90 border-primary/30 backdrop-blur-xl font-mono">
          <DialogHeader>
            <DialogTitle className="text-white uppercase tracking-wider">Update File Alias</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={renamingFile?.name || ""}
              onChange={(e) => setRenamingFile((prev) => prev ? { ...prev, name: e.target.value } : null)}
              onKeyDown={(e) => e.key === "Enter" && handleRename()}
              className="bg-black/50 border-border/50 focus:border-primary/50 text-white"
              data-testid="input-rename"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenamingFile(null)}>Cancel</Button>
            <Button onClick={handleRename} className="bg-primary text-black hover:bg-primary/90" disabled={renameMutation.isPending}>
              {renameMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Update"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Decrypt Dialog ── */}
      <Dialog open={!!decryptDialog} onOpenChange={(open) => !open && closeDecryptDialog()}>
        <DialogContent className="bg-black/90 border-accent/30 backdrop-blur-xl font-mono">
          <DialogHeader>
            <DialogTitle className="text-white uppercase tracking-wider flex items-center gap-2">
              <ShieldOff className="w-5 h-5 text-accent" /> Decrypt Asset
            </DialogTitle>
          </DialogHeader>

          {decryptResult ? (
            <div className="py-6 text-center space-y-4">
              <div className="w-16 h-16 bg-accent/20 rounded-full flex items-center justify-center mx-auto border border-accent/30 shadow-[0_0_20px_rgba(0,255,65,0.3)]">
                <Unlock className="w-8 h-8 text-accent" />
              </div>
              <p className="text-white font-mono">Asset unlocked successfully.</p>
              <p className="text-xs text-muted-foreground font-mono">Download link expires shortly. Save the file now.</p>
              <div className="flex gap-3 justify-center pt-2">
                <Button variant="outline" onClick={closeDecryptDialog} className="font-mono">Close</Button>
                <Button
                  onClick={handleDecryptDownload}
                  className="font-mono bg-accent text-black hover:bg-accent/90 shadow-[0_0_10px_rgba(0,255,65,0.3)]"
                  data-testid="button-download-decrypted"
                >
                  <Download className="w-4 h-4 mr-2" /> Download Decrypted
                </Button>
              </div>
            </div>
          ) : (
            <div className="py-4 space-y-4">
              <div className="text-xs font-mono text-muted-foreground">
                File: <span className="text-white">{decryptDialog?.name}</span>
                {decryptDialog?.algo && (
                  <span className={cn("ml-2 text-[10px] px-1.5 py-0.5 rounded border uppercase", getAlgorithmColor(decryptDialog.algo))}>
                    {decryptDialog.algo}
                  </span>
                )}
              </div>
              <div>
                <label className="text-muted-foreground font-mono uppercase text-xs block mb-1.5">Cryptographic Key</label>
                <Input
                  type="password"
                  placeholder="Enter decryption key..."
                  value={decryptKey}
                  onChange={(e) => setDecryptKey(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleDecrypt()}
                  className="bg-black/50 border-border/50 focus:border-accent/50 text-white font-mono"
                  data-testid="input-decrypt-key"
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={closeDecryptDialog}>Cancel</Button>
                <Button
                  onClick={handleDecrypt}
                  disabled={decryptMutation.isPending || !decryptKey.trim()}
                  className="bg-accent text-black hover:bg-accent/90 font-mono shadow-[0_0_10px_rgba(0,255,65,0.2)]"
                  data-testid="button-execute-decrypt"
                >
                  {decryptMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  {decryptMutation.isPending ? "Decrypting..." : "Execute Decryption"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Inline Encrypt Dialog ── */}
      <Dialog open={!!encryptDialog} onOpenChange={(open) => !open && setEncryptDialog(null)}>
        <DialogContent className="bg-black/90 border-primary/30 backdrop-blur-xl font-mono">
          <DialogHeader>
            <DialogTitle className="text-white uppercase tracking-wider flex items-center gap-2">
              <LockKeyhole className="w-5 h-5 text-primary" /> Encrypt Asset
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="text-xs font-mono text-muted-foreground">
              File: <span className="text-white">{encryptDialog?.name}</span>
            </div>

            <div>
              <label className="text-muted-foreground font-mono uppercase text-xs block mb-1.5">Algorithm</label>
              <Select value={encryptAlgo} onValueChange={(v) => setEncryptAlgo(v as typeof encryptAlgo)}>
                <SelectTrigger className="bg-black/50 border-border/50 font-mono text-primary h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-black/90 border-border/50 backdrop-blur-xl font-mono">
                  <SelectItem value="AES-256">AES-256 (Military Grade)</SelectItem>
                  <SelectItem value="RSA">RSA (Asymmetric)</SelectItem>
                  <SelectItem value="HybridAES-RSA">Hybrid AES+RSA (Maximum)</SelectItem>
                  <SelectItem value="SHA256">SHA-256 (Hash / No Decrypt)</SelectItem>
                  <SelectItem value="Caesar">Caesar Cipher</SelectItem>
                  <SelectItem value="Vigenere">Vigenere Cipher</SelectItem>
                  <SelectItem value="RailFence">Rail Fence Cipher</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-muted-foreground font-mono uppercase text-xs block mb-1.5">Output Format</label>
              <div className="flex items-center gap-2">
                <Input
                  value={encryptFormat}
                  onChange={(e) => setEncryptFormat(e.target.value)}
                  placeholder=".enc"
                  className="bg-black/50 border-border/50 focus:border-primary/50 text-white font-mono flex-1"
                  data-testid="input-encrypt-format"
                />
              </div>
              <div className="flex gap-1 mt-1.5 flex-wrap">
                {PRESET_FORMATS.map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setEncryptFormat(f)}
                    className={cn(
                      "text-[10px] px-2 py-0.5 rounded border font-mono transition-colors",
                      encryptFormat === f
                        ? "border-primary/60 text-primary bg-primary/10"
                        : "border-border/40 text-muted-foreground hover:border-primary/30 hover:text-white"
                    )}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-muted-foreground font-mono uppercase text-xs block mb-1.5">Cryptographic Key</label>
              <Input
                type="password"
                placeholder="Enter encryption key..."
                value={encryptKey}
                onChange={(e) => setEncryptKey(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleEncrypt()}
                className="bg-black/50 border-border/50 focus:border-primary/50 text-white font-mono"
                data-testid="input-encrypt-key"
              />
              <p className="text-[10px] font-mono text-muted-foreground mt-1">WARNING: Loss of this key means permanent data loss.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEncryptDialog(null)}>Cancel</Button>
            <Button
              onClick={handleEncrypt}
              disabled={encryptMutation.isPending || !encryptKey.trim()}
              className="bg-primary text-black hover:bg-primary/90 font-mono shadow-[0_0_10px_rgba(0,212,255,0.2)]"
              data-testid="button-execute-encrypt"
            >
              {encryptMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {encryptMutation.isPending ? "Encrypting..." : "Execute Encryption"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
