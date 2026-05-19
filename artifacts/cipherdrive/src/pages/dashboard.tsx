import { useGetDashboardStats } from "@workspace/api-client-react";
import { formatBytes, formatDate } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ShieldAlert, Database, FileKey, Activity, HardDrive, Cpu } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { useAuth } from "@/hooks/use-auth";

export default function Dashboard() {
  const { user } = useAuth();
  const { data: stats, isLoading } = useGetDashboardStats({ query: { queryKey: ["/api/stats/dashboard"] } });

  if (isLoading || !stats || !user) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const storagePercentage = (stats.storageUsed / stats.storageQuota) * 100;
  
  const colors = ["#00d4ff", "#7b2fff", "#00ff41", "#ffcc00", "#ff003c"];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-border/50 pb-4">
        <div>
          <h1 className="text-2xl font-mono font-bold tracking-widest text-white">SYSTEM STATUS</h1>
          <p className="text-primary/70 font-mono text-sm uppercase tracking-wider">Operator {user.username} active</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_10px_rgba(0,212,255,1)]"></span>
          <span className="text-xs font-mono text-primary uppercase">Secure Link Established</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-black/40 border-primary/20 backdrop-blur-md shadow-[0_0_15px_rgba(0,212,255,0.05)]">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-mono text-muted-foreground uppercase">Total Files</CardTitle>
            <Database className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-mono font-bold text-white">{stats.totalFiles}</div>
          </CardContent>
        </Card>
        
        <Card className="bg-black/40 border-secondary/20 backdrop-blur-md shadow-[0_0_15px_rgba(123,47,255,0.05)]">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-mono text-muted-foreground uppercase">Encrypted</CardTitle>
            <FileKey className="w-4 h-4 text-secondary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-mono font-bold text-white">{stats.encryptedFiles}</div>
          </CardContent>
        </Card>

        <Card className="bg-black/40 border-accent/20 backdrop-blur-md shadow-[0_0_15px_rgba(0,255,65,0.05)]">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-mono text-muted-foreground uppercase">Storage Used</CardTitle>
            <HardDrive className="w-4 h-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-mono font-bold text-white">{formatBytes(stats.storageUsed)}</div>
            <Progress value={storagePercentage} className="h-1 mt-3" indicatorClassName="bg-accent shadow-[0_0_10px_rgba(0,255,65,0.8)]" />
          </CardContent>
        </Card>

        <Card className="bg-black/40 border-destructive/20 backdrop-blur-md shadow-[0_0_15px_rgba(255,0,0,0.05)]">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-mono text-muted-foreground uppercase">System Load</CardTitle>
            <Cpu className="w-4 h-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-mono font-bold text-white">Normal</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        <Card className="lg:col-span-2 bg-black/40 border-border/50 backdrop-blur-md">
          <CardHeader>
            <CardTitle className="font-mono text-lg flex items-center gap-2 text-white">
              <Activity className="w-5 h-5 text-primary" />
              Recent Operations
            </CardTitle>
            <CardDescription className="font-mono text-xs uppercase">Latest events in secure vault</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.recentActivity.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground font-mono text-sm">No recent activity detected.</div>
              ) : (
                stats.recentActivity.map((activity, i) => (
                  <div key={i} className="flex items-center justify-between border-b border-border/30 pb-3 last:border-0 last:pb-0">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-primary/50"></div>
                      <div>
                        <p className="font-mono text-sm text-white">
                          <span className="text-primary uppercase mr-2">[{activity.action}]</span>
                          {activity.filename}
                        </p>
                        <p className="text-xs text-muted-foreground font-mono">
                          {formatDate(activity.createdAt)}
                          {activity.algorithm && <span className="ml-2 text-secondary">[{activity.algorithm}]</span>}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-black/40 border-border/50 backdrop-blur-md">
          <CardHeader>
            <CardTitle className="font-mono text-lg flex items-center gap-2 text-white">
              <ShieldAlert className="w-5 h-5 text-secondary" />
              Algorithm Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center items-center h-[300px]">
            {stats.algorithmBreakdown.length === 0 ? (
              <div className="text-muted-foreground font-mono text-sm">No encrypted files.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.algorithmBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="count"
                    nameKey="algorithm"
                    stroke="none"
                  >
                    {stats.algorithmBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', borderColor: 'rgba(255,255,255,0.1)', fontFamily: 'monospace' }} 
                    itemStyle={{ color: '#fff' }}
                  />
                  <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontFamily: 'monospace', fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
