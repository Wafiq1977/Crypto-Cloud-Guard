import { Router, type IRouter } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";
import { db, filesTable, historyTable, usersTable } from "@workspace/db";
import { eq, and, ilike, sql } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../../lib/auth";
import { encryptBuffer, decryptBuffer } from "../../lib/crypto";
import {
  ListFilesQueryParams,
  ListFilesResponse,
  GetFileParams,
  GetFileResponse,
  RenameFileParams,
  RenameFileBody,
  RenameFileResponse,
  DeleteFileParams,
  DeleteFileResponse,
  EncryptFileParams,
  EncryptFileBody,
  EncryptFileResponse,
  DecryptFileParams,
  DecryptFileBody,
  DecryptFileResponse,
  DownloadFileParams,
  DownloadFileResponse,
} from "@workspace/api-zod";

const UPLOADS_BASE = path.resolve(process.cwd(), "uploads");

function getUserUploadDir(userId: number): string {
  const dir = path.join(UPLOADS_BASE, `user_${userId}`);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

const storage = multer.diskStorage({
  destination: (req: AuthRequest, _file, cb) => {
    const dir = getUserUploadDir(req.userId!);
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const ALLOWED_EXTS = [
  ".txt", ".pdf", ".docx", ".xlsx", ".jpg", ".jpeg", ".png", ".zip",
  ".mp4", ".mkv", ".enc", ".cipher", ".locked",
];

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ALLOWED_EXTS.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${ext} not allowed`));
    }
  },
});

function mapFile(f: typeof filesTable.$inferSelect) {
  return {
    id: f.id,
    originalName: f.originalName,
    encryptedName: f.encryptedName ?? null,
    algorithm: f.algorithm ?? null,
    outputFormat: f.outputFormat ?? null,
    fileSize: f.fileSize,
    status: f.status,
    storagePath: f.storagePath,
    createdAt: f.createdAt.toISOString(),
    updatedAt: f.updatedAt.toISOString(),
  };
}

async function logHistory(
  userId: number,
  action: "upload" | "encrypt" | "decrypt" | "download" | "delete" | "rename",
  filename: string,
  algorithm?: string | null
) {
  await db.insert(historyTable).values({
    userId,
    action,
    filename,
    algorithm: algorithm ?? null,
  });
}

const router: IRouter = Router();

// Upload file
router.post(
  "/files",
  requireAuth,
  upload.single("file"),
  async (req: AuthRequest, res): Promise<void> => {
    if (!req.file) {
      res.status(400).json({ error: "No file provided" });
      return;
    }

    const [file] = await db
      .insert(filesTable)
      .values({
        userId: req.userId!,
        originalName: req.file.originalname,
        fileSize: req.file.size,
        storagePath: req.file.path,
        status: "uploaded",
      })
      .returning();

    // Update user storage
    await db
      .update(usersTable)
      .set({ storageUsed: sql`${usersTable.storageUsed} + ${req.file.size}` })
      .where(eq(usersTable.id, req.userId!));

    await logHistory(req.userId!, "upload", req.file.originalname);

    res.status(201).json(GetFileResponse.parse(mapFile(file)));
  }
);

// List files
router.get("/files", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const params = ListFilesQueryParams.safeParse(req.query);
  const search = params.success ? params.data.search : undefined;
  const algorithmFilter = params.success ? params.data.algorithm : undefined;
  const statusFilter = params.success ? params.data.status : undefined;

  let query = db
    .select()
    .from(filesTable)
    .where(eq(filesTable.userId, req.userId!))
    .$dynamic();

  const conditions = [eq(filesTable.userId, req.userId!)];

  if (search) {
    conditions.push(ilike(filesTable.originalName, `%${search}%`));
  }
  if (algorithmFilter) {
    conditions.push(eq(filesTable.algorithm, algorithmFilter));
  }
  if (statusFilter && statusFilter !== "all") {
    conditions.push(
      eq(filesTable.status, statusFilter as "encrypted" | "decrypted" | "uploaded")
    );
  }

  const files = await db
    .select()
    .from(filesTable)
    .where(and(...conditions))
    .orderBy(sql`${filesTable.createdAt} DESC`);

  res.json(ListFilesResponse.parse(files.map(mapFile)));
});

// Get single file
router.get("/files/:id", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const params = GetFileParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid file ID" });
    return;
  }

  const [file] = await db
    .select()
    .from(filesTable)
    .where(and(eq(filesTable.id, params.data.id), eq(filesTable.userId, req.userId!)))
    .limit(1);

  if (!file) {
    res.status(404).json({ error: "File not found" });
    return;
  }

  res.json(GetFileResponse.parse(mapFile(file)));
});

// Rename file
router.patch("/files/:id", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const params = RenameFileParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid file ID" });
    return;
  }

  const body = RenameFileBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [file] = await db
    .update(filesTable)
    .set({ originalName: body.data.originalName! })
    .where(and(eq(filesTable.id, params.data.id), eq(filesTable.userId, req.userId!)))
    .returning();

  if (!file) {
    res.status(404).json({ error: "File not found" });
    return;
  }

  await logHistory(req.userId!, "rename", file.originalName);

  res.json(RenameFileResponse.parse(mapFile(file)));
});

// Delete file
router.delete("/files/:id", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const params = DeleteFileParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid file ID" });
    return;
  }

  const [file] = await db
    .select()
    .from(filesTable)
    .where(and(eq(filesTable.id, params.data.id), eq(filesTable.userId, req.userId!)))
    .limit(1);

  if (!file) {
    res.status(404).json({ error: "File not found" });
    return;
  }

  // Delete physical file
  if (fs.existsSync(file.storagePath)) {
    fs.unlinkSync(file.storagePath);
  }

  await db
    .delete(filesTable)
    .where(and(eq(filesTable.id, params.data.id), eq(filesTable.userId, req.userId!)));

  // Update user storage
  await db
    .update(usersTable)
    .set({ storageUsed: sql`GREATEST(${usersTable.storageUsed} - ${file.fileSize}, 0)` })
    .where(eq(usersTable.id, req.userId!));

  await logHistory(req.userId!, "delete", file.originalName);

  res.json(DeleteFileResponse.parse({ success: true, message: "File deleted" }));
});

// Encrypt file
router.post("/files/:id/encrypt", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const params = EncryptFileParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid file ID" });
    return;
  }

  const body = EncryptFileBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [file] = await db
    .select()
    .from(filesTable)
    .where(and(eq(filesTable.id, params.data.id), eq(filesTable.userId, req.userId!)))
    .limit(1);

  if (!file) {
    res.status(404).json({ error: "File not found" });
    return;
  }

  if (file.status === "encrypted") {
    res.status(400).json({ error: "File is already encrypted" });
    return;
  }

  try {
    const plainData = fs.readFileSync(file.storagePath);
    const { encrypted } = encryptBuffer(plainData, body.data.algorithm, body.data.encryptionKey);

    const encryptedFilename = `${uuidv4()}${body.data.outputFormat}`;
    const encryptedPath = path.join(getUserUploadDir(req.userId!), encryptedFilename);
    fs.writeFileSync(encryptedPath, encrypted);

    const [updated] = await db
      .update(filesTable)
      .set({
        encryptedName: encryptedFilename,
        algorithm: body.data.algorithm,
        outputFormat: body.data.outputFormat,
        status: "encrypted",
        storagePath: encryptedPath,
        fileSize: encrypted.length,
      })
      .where(eq(filesTable.id, file.id))
      .returning();

    await logHistory(req.userId!, "encrypt", file.originalName, body.data.algorithm);

    res.json(EncryptFileResponse.parse(mapFile(updated)));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Encryption failed";
    res.status(400).json({ error: message });
  }
});

// Decrypt file
router.post("/files/:id/decrypt", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const params = DecryptFileParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid file ID" });
    return;
  }

  const body = DecryptFileBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [file] = await db
    .select()
    .from(filesTable)
    .where(and(eq(filesTable.id, params.data.id), eq(filesTable.userId, req.userId!)))
    .limit(1);

  if (!file) {
    res.status(404).json({ error: "File not found" });
    return;
  }

  if (file.status !== "encrypted" || !file.algorithm) {
    res.status(400).json({ error: "File is not encrypted" });
    return;
  }

  try {
    const encryptedData = fs.readFileSync(file.storagePath);
    const decrypted = decryptBuffer(encryptedData, file.algorithm, body.data.encryptionKey);

    // Write decrypted content to a new file with original name
    const decryptedStorageName = `${uuidv4()}_${file.originalName}`;
    const decryptedPath = path.join(getUserUploadDir(req.userId!), decryptedStorageName);
    fs.writeFileSync(decryptedPath, decrypted);

    // Remove the old encrypted file from disk
    if (fs.existsSync(file.storagePath)) {
      try { fs.unlinkSync(file.storagePath); } catch { /* ignore */ }
    }

    // Update the DB record: restore to decrypted state with original filename
    await db
      .update(filesTable)
      .set({
        status: "decrypted",
        storagePath: decryptedPath,
        fileSize: decrypted.length,
        encryptedName: null,
        algorithm: null,
        outputFormat: null,
      })
      .where(eq(filesTable.id, file.id));

    // Update user storage quota to reflect new (decrypted) size
    await db
      .update(usersTable)
      .set({
        storageUsed: sql`GREATEST(${usersTable.storageUsed} - ${file.fileSize} + ${decrypted.length}, 0)`,
      })
      .where(eq(usersTable.id, req.userId!));

    await logHistory(req.userId!, "decrypt", file.originalName, file.algorithm);

    res.json(
      DecryptFileResponse.parse({
        downloadUrl: `/api/files/serve/${file.id}`,
        filename: file.originalName,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      })
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Decryption failed";
    res.status(400).json({ error: message });
  }
});

// Download encrypted file (returns download URL)
router.get("/files/:id/download", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const params = DownloadFileParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid file ID" });
    return;
  }

  const [file] = await db
    .select()
    .from(filesTable)
    .where(and(eq(filesTable.id, params.data.id), eq(filesTable.userId, req.userId!)))
    .limit(1);

  if (!file) {
    res.status(404).json({ error: "File not found" });
    return;
  }

  await logHistory(req.userId!, "download", file.originalName, file.algorithm);

  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  const filename = file.encryptedName || file.originalName;

  res.json(
    DownloadFileResponse.parse({
      downloadUrl: `/api/files/serve/${params.data.id}?userId=${req.userId}`,
      filename,
      expiresAt: expiresAt.toISOString(),
    })
  );
});

// Serve file directly (actual download endpoint)
router.get("/files/serve/:id", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);

  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid file ID" });
    return;
  }

  const [file] = await db
    .select()
    .from(filesTable)
    .where(and(eq(filesTable.id, id), eq(filesTable.userId, req.userId!)))
    .limit(1);

  if (!file || !fs.existsSync(file.storagePath)) {
    res.status(404).json({ error: "File not found" });
    return;
  }

  const filename = file.encryptedName || file.originalName;
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.setHeader("Content-Type", "application/octet-stream");
  fs.createReadStream(file.storagePath).pipe(res as unknown as NodeJS.WritableStream);
});

// Serve decrypted temp file
router.get("/files/download-temp/:filename", async (req, res): Promise<void> => {
  const rawFilename = Array.isArray(req.params.filename) ? req.params.filename[0] : req.params.filename;
  // Basic security: only allow alphanumeric, dash, underscore, dot
  if (!/^[a-zA-Z0-9._-]+$/.test(rawFilename)) {
    res.status(400).json({ error: "Invalid filename" });
    return;
  }

  const userId = req.query.userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const filePath = path.join(UPLOADS_BASE, `user_${userId}`, rawFilename);
  if (!fs.existsSync(filePath)) {
    res.status(404).json({ error: "File not found or expired" });
    return;
  }

  res.setHeader("Content-Disposition", `attachment; filename="${rawFilename}"`);
  res.setHeader("Content-Type", "application/octet-stream");
  const stream = fs.createReadStream(filePath);
  stream.pipe(res as unknown as NodeJS.WritableStream);

  // Delete after download
  stream.on("close", () => {
    try {
      fs.unlinkSync(filePath);
    } catch {
      // ignore
    }
  });
});

export default router;
