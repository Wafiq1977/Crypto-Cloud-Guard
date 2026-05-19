import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useListFiles, getListFilesQueryKey, useDecryptFile, useDownloadFile } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Unlock, FileCode2, Loader2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { formatBytes, getAlgorithmColor, cn } from "@/lib/utils";

const decryptSchema = z.object({
  fileId: z.string().min(1, "Select a file to decrypt"),
  encryptionKey: z.string().min(1, "Encryption key required"),
});

type DecryptForm = z.infer<typeof decryptSchema>;

export default function Decrypt() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [decryptedFileId, setDecryptedFileId] = useState<number | null>(null);

  const { data: files } = useListFiles(
    { status: "encrypted" },
    { query: { queryKey: getListFilesQueryKey({ status: "encrypted" }) } }
  );

  const decryptMutation = useDecryptFile();
  const { refetch: downloadRefetch, isFetching: isDownloading } = useDownloadFile(decryptedFileId!, { query: { enabled: false, queryKey: ["/api/files", decryptedFileId, "download"] } });

  const form = useForm<DecryptForm>({
    resolver: zodResolver(decryptSchema),
    defaultValues: {
      fileId: "",
      encryptionKey: "",
    },
  });

  const onSubmit = (data: DecryptForm) => {
    const fileId = parseInt(data.fileId);
    
    decryptMutation.mutate({ 
      id: fileId, 
      data: {
        encryptionKey: data.encryptionKey,
      } 
    }, {
      onSuccess: () => {
        toast({ title: "Decryption Successful", description: "Asset unlocked. Ready for extraction." });
        setDecryptedFileId(fileId);
        queryClient.invalidateQueries({ queryKey: getListFilesQueryKey() });
        queryClient.invalidateQueries({ queryKey: ["/api/stats/dashboard"] });
      },
      onError: (err: any) => {
        toast({ title: "Decryption Failed", description: err.message || "Invalid key or corrupted file.", variant: "destructive" });
      }
    });
  };

  const handleDownload = async () => {
    if (!decryptedFileId) return;
    
    try {
      const { data } = await downloadRefetch();
      if (data && data.downloadUrl) {
        // In a real app we'd redirect to the pre-signed URL or trigger download
        window.open(data.downloadUrl, '_blank');
        toast({ title: "Download Initiated", description: "Secure transfer started." });
        
        // Reset state after download
        setDecryptedFileId(null);
        form.reset();
      }
    } catch (e) {
      toast({ title: "Download Failed", description: "Could not retrieve asset.", variant: "destructive" });
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-3 border-b border-border/50 pb-4 mb-8">
        <div className="w-10 h-10 bg-accent/10 rounded flex items-center justify-center border border-accent/30">
          <Unlock className="w-5 h-5 text-accent" />
        </div>
        <div>
          <h1 className="text-2xl font-mono font-bold tracking-widest text-white">DECRYPTION PROTOCOL</h1>
          <p className="text-accent/70 font-mono text-sm uppercase tracking-wider">Unlock secured assets</p>
        </div>
      </div>

      <Card className="bg-black/40 border-border/50 backdrop-blur-md">
        <CardContent className="p-6 md:p-8">
          {decryptedFileId ? (
            <div className="text-center py-8">
              <div className="w-24 h-24 bg-accent/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-accent/30 shadow-[0_0_30px_rgba(0,255,65,0.3)]">
                <FileCode2 className="w-12 h-12 text-accent" />
              </div>
              <h2 className="text-2xl font-mono text-white mb-2 uppercase">Asset Unlocked</h2>
              <p className="text-muted-foreground font-mono mb-8">Cryptographic locks removed. File is ready for secure extraction.</p>
              
              <div className="flex justify-center gap-4">
                <Button variant="outline" className="font-mono border-accent/50 text-accent hover:bg-accent/10" onClick={() => { setDecryptedFileId(null); form.reset(); }}>
                  Cancel
                </Button>
                <Button 
                  className="font-mono bg-accent text-black hover:bg-accent/90 shadow-[0_0_15px_rgba(0,255,65,0.4)]" 
                  onClick={handleDownload}
                  disabled={isDownloading}
                >
                  {isDownloading ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Download className="w-5 h-5 mr-2" />}
                  Initiate Extraction
                </Button>
              </div>
            </div>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                
                <FormField
                  control={form.control}
                  name="fileId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-muted-foreground font-mono uppercase text-xs">Select Encrypted Asset</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-black/50 border-border/50 focus:ring-accent/50 font-mono text-white h-12">
                            <SelectValue placeholder="Select locked file..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-black/90 border-border/50 backdrop-blur-xl font-mono">
                          {!files || files.length === 0 ? (
                            <div className="p-4 text-center text-sm text-muted-foreground">No encrypted files found in vault.</div>
                          ) : (
                            files.map(file => (
                              <SelectItem key={file.id} value={file.id.toString()} className="focus:bg-accent/20 focus:text-white cursor-pointer py-3">
                                <div className="flex items-center justify-between w-[300px] md:w-[500px] gap-4">
                                  <span className="truncate">{file.encryptedName || file.originalName}</span>
                                  <div className="flex items-center gap-2 flex-shrink-0">
                                    {file.algorithm && (
                                      <span className={cn("text-[10px] px-1.5 py-0.5 rounded border uppercase", getAlgorithmColor(file.algorithm))}>
                                        {file.algorithm}
                                      </span>
                                    )}
                                    <span className="text-xs text-muted-foreground">{formatBytes(file.fileSize)}</span>
                                  </div>
                                </div>
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage className="font-mono text-xs text-destructive" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="encryptionKey"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-muted-foreground font-mono uppercase text-xs">Cryptographic Key</FormLabel>
                      <FormControl>
                        <Input 
                          type="password"
                          placeholder="Enter secure key to decrypt this asset..." 
                          className="bg-black/50 border-border/50 focus:border-accent/50 focus:ring-accent/50 font-mono text-white h-12" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage className="font-mono text-xs text-destructive" />
                    </FormItem>
                  )}
                />

                <div className="pt-4 border-t border-border/50">
                  <Button 
                    type="submit" 
                    className="w-full font-mono uppercase tracking-widest bg-accent hover:bg-accent/90 text-black font-bold h-12 shadow-[0_0_15px_rgba(0,255,65,0.3)] transition-all"
                    disabled={decryptMutation.isPending}
                  >
                    {decryptMutation.isPending ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Brute Forcing...
                      </>
                    ) : (
                      "Execute Decryption"
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
