import { useListHistory, getListHistoryQueryKey } from "@workspace/api-client-react";
import { format } from "date-fns";
import { History as HistoryIcon, Upload, Lock, Unlock, Download, Trash2, Edit2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default function History() {
  const { data: history, isLoading } = useListHistory(
    { limit: 50 },
    { query: { queryKey: getListHistoryQueryKey({ limit: 50 }) } }
  );

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'upload': return <Upload className="w-4 h-4 text-blue-400" />;
      case 'encrypt': return <Lock className="w-4 h-4 text-primary" />;
      case 'decrypt': return <Unlock className="w-4 h-4 text-accent" />;
      case 'download': return <Download className="w-4 h-4 text-secondary" />;
      case 'delete': return <Trash2 className="w-4 h-4 text-destructive" />;
      case 'rename': return <Edit2 className="w-4 h-4 text-yellow-400" />;
      default: return <HistoryIcon className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'upload': return "text-blue-400 border-blue-400/30 bg-blue-400/10";
      case 'encrypt': return "text-primary border-primary/30 bg-primary/10";
      case 'decrypt': return "text-accent border-accent/30 bg-accent/10";
      case 'download': return "text-secondary border-secondary/30 bg-secondary/10";
      case 'delete': return "text-destructive border-destructive/30 bg-destructive/10";
      case 'rename': return "text-yellow-400 border-yellow-400/30 bg-yellow-400/10";
      default: return "text-muted-foreground border-muted-foreground/30 bg-muted/10";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 border-b border-border/50 pb-4 mb-8">
        <div className="w-10 h-10 bg-white/5 rounded flex items-center justify-center border border-white/10">
          <HistoryIcon className="w-5 h-5 text-white/70" />
        </div>
        <div>
          <h1 className="text-2xl font-mono font-bold tracking-widest text-white">ACTIVITY LOG</h1>
          <p className="text-white/50 font-mono text-sm uppercase tracking-wider">System audit trail</p>
        </div>
      </div>

      <Card className="bg-black/40 border-border/50 backdrop-blur-md">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
            </div>
          ) : !history || history.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground font-mono">
              No system activity recorded.
            </div>
          ) : (
            <div className="divide-y divide-border/30">
              {history.map((entry) => (
                <div key={entry.id} className="p-4 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-white/5 transition-colors">
                  <div className="flex items-start md:items-center gap-4">
                    <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0 border", getActionColor(entry.action))}>
                      {getActionIcon(entry.action)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-white font-medium">{entry.filename}</span>
                        {entry.algorithm && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-white/20 bg-white/5 text-white/70">
                            {entry.algorithm}
                          </span>
                        )}
                      </div>
                      <div className="font-mono text-xs text-muted-foreground mt-1 uppercase tracking-wider">
                        {entry.action} operation completed
                      </div>
                    </div>
                  </div>
                  
                  <div className="font-mono text-xs text-muted-foreground shrink-0 md:text-right border-l md:border-l-0 border-border/50 pl-12 md:pl-0">
                    <div className="text-white/70">{format(new Date(entry.createdAt), "yyyy.MM.dd")}</div>
                    <div>{format(new Date(entry.createdAt), "HH:mm:ss.SSS")}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
