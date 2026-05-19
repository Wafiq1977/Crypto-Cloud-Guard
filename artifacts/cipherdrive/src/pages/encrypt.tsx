import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useListFiles, getListFilesQueryKey, useEncryptFile } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Shield, LockKeyhole, File, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { formatBytes } from "@/lib/utils";

const encryptSchema = z.object({
  fileId: z.string().min(1, "Select a file to encrypt"),
  algorithm: z.enum(["AES-256", "RSA", "Caesar", "Vigenere", "RailFence", "SHA256", "HybridAES-RSA"]),
  encryptionKey: z.string().min(8, "Encryption key must be at least 8 characters"),
  outputFormat: z.enum([".enc", ".cipher", ".locked"]),
});

type EncryptForm = z.infer<typeof encryptSchema>;

export default function Encrypt() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [successFile, setSuccessFile] = useState<{name: string, format: string, algo: string} | null>(null);

  const { data: files } = useListFiles(
    { status: "uploaded" },
    { query: { queryKey: getListFilesQueryKey({ status: "uploaded" }) } }
  );

  const encryptMutation = useEncryptFile();

  const form = useForm<EncryptForm>({
    resolver: zodResolver(encryptSchema),
    defaultValues: {
      fileId: "",
      algorithm: "AES-256",
      encryptionKey: "",
      outputFormat: ".enc",
    },
  });

  const onSubmit = (data: EncryptForm) => {
    const fileId = parseInt(data.fileId);
    
    encryptMutation.mutate({ 
      id: fileId, 
      data: {
        algorithm: data.algorithm,
        encryptionKey: data.encryptionKey,
        outputFormat: data.outputFormat
      } 
    }, {
      onSuccess: (res) => {
        toast({ title: "Encryption Protocol Complete", description: "File secured successfully." });
        setSuccessFile({ name: res.originalName, format: data.outputFormat, algo: data.algorithm });
        queryClient.invalidateQueries({ queryKey: getListFilesQueryKey() });
        queryClient.invalidateQueries({ queryKey: ["/api/stats/dashboard"] });
      },
      onError: (err: any) => {
        toast({ title: "Encryption Failed", description: err.message || "Protocol aborted.", variant: "destructive" });
      }
    });
  };

  if (successFile) {
    return (
      <div className="max-w-2xl mx-auto mt-12">
        <Card className="bg-black/60 border-primary/50 shadow-[0_0_30px_rgba(0,212,255,0.2)] backdrop-blur-xl">
          <CardContent className="p-12 flex flex-col items-center text-center">
            <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(0,212,255,0.5)]">
              <CheckCircle2 className="w-10 h-10 text-primary" />
            </div>
            <h2 className="text-2xl font-mono font-bold text-white mb-2 uppercase tracking-widest">Protocol Complete</h2>
            <p className="text-muted-foreground font-mono mb-8">
              Asset <span className="text-white">{successFile.name}</span> has been secured using <span className="text-primary">{successFile.algo}</span>.
              <br/>Output designated as <span className="text-white">{successFile.format}</span>.
            </p>
            <div className="flex gap-4">
              <Button variant="outline" className="font-mono border-primary/50 text-primary hover:bg-primary/10" onClick={() => setLocation("/files")}>
                View Vault
              </Button>
              <Button className="font-mono bg-primary text-black hover:bg-primary/90" onClick={() => { setSuccessFile(null); form.reset(); }}>
                Encrypt Another
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-3 border-b border-border/50 pb-4 mb-8">
        <div className="w-10 h-10 bg-primary/10 rounded flex items-center justify-center border border-primary/30">
          <LockKeyhole className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-mono font-bold tracking-widest text-white">ENCRYPTION PROTOCOL</h1>
          <p className="text-primary/70 font-mono text-sm uppercase tracking-wider">Secure vulnerable assets</p>
        </div>
      </div>

      <Card className="bg-black/40 border-border/50 backdrop-blur-md">
        <CardContent className="p-6 md:p-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              
              <FormField
                control={form.control}
                name="fileId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-muted-foreground font-mono uppercase text-xs">Select Asset</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-black/50 border-border/50 focus:ring-primary/50 font-mono text-white h-12">
                          <SelectValue placeholder="Select vulnerable file..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-black/90 border-border/50 backdrop-blur-xl font-mono">
                        {!files || files.length === 0 ? (
                          <div className="p-4 text-center text-sm text-muted-foreground">No unencrypted files found in vault.</div>
                        ) : (
                          files.map(file => (
                            <SelectItem key={file.id} value={file.id.toString()} className="focus:bg-primary/20 focus:text-white cursor-pointer py-3">
                              <div className="flex items-center justify-between w-full gap-4">
                                <span>{file.originalName}</span>
                                <span className="text-xs text-muted-foreground">{formatBytes(file.fileSize)}</span>
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="algorithm"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-muted-foreground font-mono uppercase text-xs">Encryption Algorithm</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-black/50 border-border/50 focus:ring-primary/50 font-mono text-primary h-12">
                            <SelectValue placeholder="Select algorithm" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-black/90 border-border/50 backdrop-blur-xl font-mono">
                          <SelectItem value="AES-256">AES-256 (Military Grade)</SelectItem>
                          <SelectItem value="RSA">RSA (Asymmetric)</SelectItem>
                          <SelectItem value="HybridAES-RSA">Hybrid AES+RSA (Maximum)</SelectItem>
                          <SelectItem value="SHA256">SHA-256 (Hash / No Decrypt)</SelectItem>
                          <SelectItem value="Caesar">Caesar Cipher (Legacy)</SelectItem>
                          <SelectItem value="Vigenere">Vigenere Cipher (Legacy)</SelectItem>
                          <SelectItem value="RailFence">Rail Fence (Legacy)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage className="font-mono text-xs text-destructive" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="outputFormat"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-muted-foreground font-mono uppercase text-xs">Output Format</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-black/50 border-border/50 focus:ring-primary/50 font-mono text-white h-12">
                            <SelectValue placeholder="Select format" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-black/90 border-border/50 backdrop-blur-xl font-mono">
                          <SelectItem value=".enc">.enc</SelectItem>
                          <SelectItem value=".cipher">.cipher</SelectItem>
                          <SelectItem value=".locked">.locked</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage className="font-mono text-xs text-destructive" />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="encryptionKey"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-muted-foreground font-mono uppercase text-xs">Cryptographic Key</FormLabel>
                    <FormControl>
                      <Input 
                        type="password"
                        placeholder="Enter secure key to encrypt this asset..." 
                        className="bg-black/50 border-border/50 focus:border-primary/50 focus:ring-primary/50 font-mono text-white h-12" 
                        {...field} 
                      />
                    </FormControl>
                    <p className="text-[10px] font-mono text-muted-foreground mt-1">WARNING: Loss of this key will result in permanent data loss. CipherDrive cannot recover lost keys.</p>
                    <FormMessage className="font-mono text-xs text-destructive" />
                  </FormItem>
                )}
              />

              <div className="pt-4 border-t border-border/50">
                <Button 
                  type="submit" 
                  className="w-full font-mono uppercase tracking-widest bg-primary hover:bg-primary/90 text-black font-bold h-12 shadow-[0_0_15px_rgba(0,212,255,0.3)] transition-all"
                  disabled={encryptMutation.isPending}
                >
                  {encryptMutation.isPending ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Executing Protocol...
                    </>
                  ) : (
                    "Execute Encryption"
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
