import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import multer from "multer";
import path from "path";
import fs from "fs";
import { db, usersTable } from "@workspace/db";
import { eq, or } from "drizzle-orm";
import { signToken, requireAuth, type AuthRequest } from "../../lib/auth";
import {
  RegisterBody,
  LoginBody,
  LoginResponse,
  GetCurrentUserResponse,
} from "@workspace/api-zod";

const AVATARS_DIR = path.resolve(process.cwd(), "uploads", "avatars");
if (!fs.existsSync(AVATARS_DIR)) fs.mkdirSync(AVATARS_DIR, { recursive: true });

const avatarStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, AVATARS_DIR),
  filename: (req: AuthRequest, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `user_${req.userId}${ext}`);
  },
});

const AVATAR_ALLOWED = [".jpg", ".jpeg", ".png", ".gif", ".webp"];

const uploadAvatar = multer({
  storage: avatarStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (AVATAR_ALLOWED.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${ext} not supported for avatar`));
    }
  },
});

const MIME_MAP: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
};

/** Public URL for an avatar — readable by <img> without auth */
function publicAvatarUrl(userId: number, avatarPath: string | null | undefined): string | null {
  if (!avatarPath) return null;
  return `/api/auth/avatar/${userId}`;
}

function buildUserOut(user: typeof usersTable.$inferSelect) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    createdAt: user.createdAt.toISOString(),
    storageUsed: user.storageUsed,
    storageQuota: user.storageQuota,
    avatarUrl: publicAvatarUrl(user.id, user.avatarPath),
  };
}

const router: IRouter = Router();

router.post("/auth/register", async (req, res): Promise<void> => {
  const parsed = RegisterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { username, email, password } = parsed.data;

  const [existing] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(or(eq(usersTable.email, email), eq(usersTable.username, username)))
    .limit(1);

  if (existing) {
    res.status(409).json({ error: "Email or username already in use" });
    return;
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const [user] = await db
    .insert(usersTable)
    .values({ username, email, password: hashedPassword })
    .returning();

  const token = signToken({ userId: user.id, email: user.email });
  res.status(201).json(LoginResponse.parse({ user: buildUserOut(user), token }));
});

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { email, password } = parsed.data;

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email))
    .limit(1);

  if (!user) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const token = signToken({ userId: user.id, email: user.email });
  res.json(LoginResponse.parse({ user: buildUserOut(user), token }));
});

router.post("/auth/logout", (_req, res): void => {
  res.json({ success: true, message: "Logged out" });
});

router.get("/auth/me", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, req.userId!))
    .limit(1);

  if (!user) {
    res.status(401).json({ error: "User not found" });
    return;
  }

  res.json(GetCurrentUserResponse.parse(buildUserOut(user)));
});

// POST /auth/avatar — upload profile photo (authenticated)
router.post(
  "/auth/avatar",
  requireAuth,
  (req: AuthRequest, res, next) => {
    uploadAvatar.single("avatar")(req as any, res, next);
  },
  async (req: AuthRequest, res): Promise<void> => {
    if (!req.file) {
      res.status(400).json({ error: "No file provided" });
      return;
    }

    const [existing] = await db
      .select({ avatarPath: usersTable.avatarPath })
      .from(usersTable)
      .where(eq(usersTable.id, req.userId!))
      .limit(1);

    if (existing?.avatarPath && existing.avatarPath !== req.file.path) {
      try { fs.unlinkSync(existing.avatarPath); } catch { /* ignore */ }
    }

    await db
      .update(usersTable)
      .set({ avatarPath: req.file.path })
      .where(eq(usersTable.id, req.userId!));

    res.json({ avatarUrl: publicAvatarUrl(req.userId!, req.file.path) });
  }
);

// DELETE /auth/avatar — remove profile photo (authenticated)
router.delete("/auth/avatar", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const [user] = await db
    .select({ avatarPath: usersTable.avatarPath })
    .from(usersTable)
    .where(eq(usersTable.id, req.userId!))
    .limit(1);

  if (user?.avatarPath) {
    try { fs.unlinkSync(user.avatarPath); } catch { /* ignore */ }
  }

  await db
    .update(usersTable)
    .set({ avatarPath: null })
    .where(eq(usersTable.id, req.userId!));

  res.json({ success: true });
});

// GET /auth/avatar/:userId — PUBLIC serve endpoint so <img> tags work without auth
router.get("/auth/avatar/:userId", async (req, res): Promise<void> => {
  const userId = parseInt(req.params.userId, 10);
  if (isNaN(userId)) {
    res.status(400).json({ error: "Invalid user id" });
    return;
  }

  const [user] = await db
    .select({ avatarPath: usersTable.avatarPath })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);

  if (!user?.avatarPath || !fs.existsSync(user.avatarPath)) {
    res.status(404).json({ error: "No avatar" });
    return;
  }

  const ext = path.extname(user.avatarPath).toLowerCase();
  res.setHeader("Content-Type", MIME_MAP[ext] ?? "image/jpeg");
  res.setHeader("Cache-Control", "public, max-age=60");
  fs.createReadStream(user.avatarPath).pipe(res);
});

export default router;
