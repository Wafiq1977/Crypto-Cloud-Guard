import { useState } from "react";
import { useListFiles, getListFilesQueryKey, useDeleteFile, useRenameFile } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { formatBytes, formatDate, getAlgorithmColor, cn } from "@/lib/utils";
import { FileUpload } from "@/components/file-upload";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Lock, Unlock, File, MoreVertical, Trash2, Edit2, ShieldAlert } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

export default function Files() {
  const [searchTerm, setSearchTerm] = useState("");
  const [renamingFile, setRenamingFile] = useState<{id: number, name: string} | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: files, isLoading } = useListFiles(
    { search: searchTerm || undefined },
    { query: { queryKey: getListFilesQueryKey({ search: searchTerm || undefined }) } }
  );

  const deleteMutation = useDeleteFile();
  const renameMutation = useRenameFile();

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to securely delete this file? This action cannot be undone.")) {
      deleteMutation.mutate({ id }, {
        onSuccess: () => {
          toast({ title: "File Purged", description: "File securely removed from vault." });
          queryClient.invalidateQueries({ queryKey: getListFilesQueryKey() });
        },
        onError: () => {
          toast({ title: "Deletion Failed", description: "Could not remove file.", variant: "destructive" });
        }
      });
    }
  };

  const handleRename = () => {
    if (!renamingFile || !renamingFile.name.trim()) return;
    
    renameMutation.mutate({ 
      id: renamingFile.id, 
      data: { originalName: renamingFile.name } 
    }, {
      onSuccess: () => {
        toast({ title: "File Renamed", description: "File alias updated successfully." });
        setRenamingFile(null);
        queryClient.invalidateQueries({ queryKey: getListFilesQueryKey() });
      },
      onError: () => {
        toast({ title: "Rename Failed", description: "Could not update file alias.", variant: "destructive" });
      }
    });
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
          />
        </div>
      </div>

      <FileUpload className="mb-8" />

      <div className="grid grid-cols-1 gap-4">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : !files || files.length === 0 ? (
          <div className="text-center py-16 bg-black/20 rounded-lg border border-border/30 border-dashed">
            <ShieldAlert className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="font-mono text-lg text-white mb-2">Vault Empty</h3>
            <p className="font-mono text-sm text-muted-foreground">Upload files above to begin encryption process.</p>
          </div>
        ) : (
          files.map(file => (
            <Card key={file.id} className="bg-black/40 border-border/50 backdrop-blur-md hover:border-primary/30 transition-colors group">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4 min-w-0 flex-1">
                  <div className={cn(
                    "w-10 h-10 rounded flex items-center justify-center flex-shrink-0 border",
                    file.status === 'encrypted' ? "bg-primary/10 border-primary/30 text-primary shadow-[0_0_10px_rgba(0,212,255,0.2)]" :
                    file.status === 'decrypted' ? "bg-accent/10 border-accent/30 text-accent" :
                    "bg-muted/10 border-muted/30 text-muted-foreground"
                  )}>
                    {file.status === 'encrypted' ? <Lock className="w-5 h-5" /> : 
                     file.status === 'decrypted' ? <Unlock className="w-5 h-5" /> : 
                     <File className="w-5 h-5" />}
                  </div>
                  
                  <div className="min-w-0 flex-1">
                    <h4 className="font-mono font-medium text-white truncate">
                      {file.originalName}
                      {file.encryptedName && <span className="text-muted-foreground ml-2 text-xs">→ {file.encryptedName}</span>}
                    </h4>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      <span className="text-xs font-mono text-muted-foreground">{formatBytes(file.fileSize)}</span>
                      <span className="text-xs font-mono text-muted-foreground/50">•</span>
                      <span className="text-xs font-mono text-muted-foreground">{formatDate(file.createdAt)}</span>
                      
                      {file.algorithm && (
                        <>
                          <span className="text-xs font-mono text-muted-foreground/50">•</span>
                          <span className={cn("text-[10px] px-1.5 py-0.5 rounded border uppercase tracking-wider font-mono", getAlgorithmColor(file.algorithm))}>
                            {file.algorithm}
                          </span>
                        </>
                      )}
                      
                      <span className={cn(
                        "text-[10px] px-1.5 py-0.5 rounded border uppercase tracking-wider font-mono ml-auto md:ml-0",
                        file.status === 'encrypted' ? "bg-primary/10 text-primary border-primary/30" :
                        file.status === 'decrypted' ? "bg-accent/10 text-accent border-accent/30" :
                        "bg-gray-500/10 text-gray-400 border-gray-500/30"
                      )}>
                        {file.status}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="ml-4 flex-shrink-0">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-white">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-black/90 backdrop-blur-xl border-border/50 font-mono">
                      <DropdownMenuItem onClick={() => setRenamingFile({id: file.id, name: file.originalName})} className="hover:bg-white/10 cursor-pointer">
                        <Edit2 className="w-4 h-4 mr-2" /> Rename
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDelete(file.id)} className="text-destructive hover:bg-destructive/10 hover:text-destructive cursor-pointer">
                        <Trash2 className="w-4 h-4 mr-2" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Dialog open={!!renamingFile} onOpenChange={(open) => !open && setRenamingFile(null)}>
        <DialogContent className="bg-black/90 border-primary/30 backdrop-blur-xl font-mono">
          <DialogHeader>
            <DialogTitle className="text-white uppercase tracking-wider">Update File Alias</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input 
              value={renamingFile?.name || ""} 
              onChange={(e) => setRenamingFile(prev => prev ? {...prev, name: e.target.value} : null)}
              className="bg-black/50 border-border/50 focus:border-primary/50 text-white"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenamingFile(null)}>Cancel</Button>
            <Button onClick={handleRename} className="bg-primary text-black hover:bg-primary/90" disabled={renameMutation.isPending}>
              Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
