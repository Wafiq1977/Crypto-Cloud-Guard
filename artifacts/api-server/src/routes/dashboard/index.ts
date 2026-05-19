import { Router, type IRouter } from "express";
import { db, filesTable, historyTable, usersTable } from "@workspace/db";
import { eq, sql, desc } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../../lib/auth";
import { GetDashboardStatsResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/dashboard/stats", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const userId = req.userId!;

  const [user] = await db
    .select({ storageUsed: usersTable.storageUsed, storageQuota: usersTable.storageQuota })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);

  const files = await db
    .select({ status: filesTable.status, algorithm: filesTable.algorithm })
    .from(filesTable)
    .where(eq(filesTable.userId, userId));

  const totalFiles = files.length;
  const encryptedFiles = files.filter((f) => f.status === "encrypted").length;

  // Algorithm breakdown
  const algoMap: Record<string, number> = {};
  for (const f of files) {
    if (f.algorithm) {
      algoMap[f.algorithm] = (algoMap[f.algorithm] || 0) + 1;
    }
  }
  const algorithmBreakdown = Object.entries(algoMap).map(([algorithm, count]) => ({
    algorithm,
    count,
  }));

  // Recent activity (last 10)
  const recentHistory = await db
    .select()
    .from(historyTable)
    .where(eq(historyTable.userId, userId))
    .orderBy(desc(historyTable.createdAt))
    .limit(10);

  const recentActivity = recentHistory.map((e) => ({
    id: e.id,
    action: e.action,
    filename: e.filename,
    algorithm: e.algorithm ?? null,
    createdAt: e.createdAt.toISOString(),
  }));

  const stats = {
    totalFiles,
    encryptedFiles,
    storageUsed: user?.storageUsed ?? 0,
    storageQuota: user?.storageQuota ?? 1073741824,
    recentActivity,
    algorithmBreakdown,
  };

  res.json(GetDashboardStatsResponse.parse(stats));
});

export default router;
