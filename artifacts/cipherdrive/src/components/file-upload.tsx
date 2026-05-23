import { useState, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getListFilesQueryKey } from "@workspace/api-client-react";
import { UploadCloud, X, File as FileIcon } from "lucide-react";
import { Progress } from "./ui/progress";
import { Button } from "./ui/button";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export function FileUpload({ className, onUploadComplete }: { className?: string; onUploadComplete?: () => void }) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = () => {
    if (!file) return;

    setIsUploading(true);
    setProgress(0);

    const formData = new FormData();
    formData.append("file", file);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/files", true);
    
    const token = localStorage.getItem("cipherdrive_token");
    if (token) {
      xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    }

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        const percentComplete = (e.loaded / e.total) * 100;
        setProgress(percentComplete);
      }
    };

    xhr.onload = () => {
      setIsUploading(false);
      if (xhr.status >= 200 && xhr.status < 300) {
        toast({ title: "Upload complete", description: `${file.name} has been securely uploaded.` });
        setFile(null);
        setProgress(0);
        queryClient.invalidateQueries({ queryKey: getListFilesQueryKey() });
        queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
        queryClient.invalidateQueries({ queryKey: ["/api/stats/dashboard"] });
        onUploadComplete?.();
      } else {
        toast({ title: "Upload failed", description: "Failed to upload file. Please try again.", variant: "destructive" });
      }
    };

    xhr.onerror = () => {
      setIsUploading(false);
      toast({ title: "Upload error", description: "A network error occurred during upload.", variant: "destructive" });
    };

    xhr.send(formData);
  };

  return (
    <div className={cn("w-full", className)}>
      {!file ? (
        <div
          className={cn(
            "border-2 border-dashed rounded-lg p-10 flex flex-col items-center justify-center transition-colors duration-200 cursor-pointer backdrop-blur-sm bg-black/40",
            isDragging ? "border-primary bg-primary/10 shadow-[0_0_15px_rgba(0,212,255,0.3)]" : "border-muted-foreground/30 hover:border-primary/50 hover:bg-muted/20"
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <UploadCloud className={cn("w-12 h-12 mb-4", isDragging ? "text-primary" : "text-muted-foreground")} />
          <h3 className="text-lg font-mono font-medium text-foreground mb-1">Drag & drop to encrypt</h3>
          <p className="text-sm text-muted-foreground mb-4">or click to browse local files</p>
          <input
            type="file"
            className="hidden"
            ref={fileInputRef}
            onChange={handleFileChange}
          />
          <Button variant="outline" className="font-mono" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>
            Select File
          </Button>
        </div>
      ) : (
        <div className="border border-border rounded-lg p-6 bg-black/40 backdrop-blur-sm relative overflow-hidden">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-primary/20 rounded flex items-center justify-center border border-primary/30">
              <FileIcon className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-mono font-medium truncate text-foreground">{file.name}</h4>
              <p className="text-sm text-muted-foreground font-mono">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
            {!isUploading && (
              <Button variant="ghost" size="icon" onClick={() => setFile(null)} className="rounded-full hover:bg-destructive/20 hover:text-destructive">
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
          
          {isUploading ? (
            <div className="space-y-2 mt-4">
              <div className="flex justify-between text-xs font-mono text-primary">
                <span>UPLOADING...</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-1 bg-muted" />
            </div>
          ) : (
            <div className="flex justify-end mt-4">
              <Button onClick={handleUpload} className="font-mono bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_10px_rgba(0,212,255,0.4)]">
                Initialize Upload
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
