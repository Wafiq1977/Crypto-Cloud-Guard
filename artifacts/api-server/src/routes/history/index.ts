import { Router, type IRouter } from "express";
import { db, historyTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../../lib/auth";
import { ListHistoryResponse, ListHistoryQueryParams } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/history", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const params = ListHistoryQueryParams.safeParse(req.query);
  const limit = params.success ? (params.data.limit ?? 50) : 50;

  const entries = await db
    .select()
    .from(historyTable)
    .where(eq(historyTable.userId, req.userId!))
    .orderBy(desc(historyTable.createdAt))
    .limit(limit);

  const out = entries.map((e) => ({
    id: e.id,
    action: e.action,
    filename: e.filename,
    algorithm: e.algorithm ?? null,
    createdAt: e.createdAt.toISOString(),
  }));

  res.json(ListHistoryResponse.parse(out));
});

export default router;
