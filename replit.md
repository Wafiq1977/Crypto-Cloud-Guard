# CipherDrive

CipherDrive is a futuristic cloud file encryption platform — upload files, encrypt them with 7 different cryptographic algorithms, and manage your encrypted vault like a Google Drive for secrets.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/cipherdrive run dev` — run the frontend (port 25689)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string, `SESSION_SECRET` — JWT signing secret

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + TailwindCSS + Framer Motion + Recharts
- API: Express 5 + JWT auth (jsonwebtoken) + bcryptjs + multer (file upload)
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — API contract (source of truth)
- `lib/db/src/schema/` — DB tables: users, files, history
- `artifacts/api-server/src/routes/` — auth, files, history, dashboard routes
- `artifacts/api-server/src/lib/crypto.ts` — all 7 encryption algorithm implementations
- `artifacts/api-server/src/lib/auth.ts` — JWT middleware
- `artifacts/cipherdrive/src/` — React frontend
- `uploads/` — user file storage (auto-created, organized as `uploads/user_<id>/`)

## Architecture decisions

- JWT tokens stored in localStorage; Authorization header added by custom-fetch.ts
- File uploads bypass codegen (raw FormData + XHR for progress) — POST /api/files directly
- Encryption done server-side: file read from disk, encrypted, written as new file; original replaced
- Decryption creates a temp file returned via one-time download URL (deleted after download)
- All 7 algorithms implemented in pure Node.js crypto module (no external crypto libraries)
- SHA-256 is one-way only (no decrypt route for that algorithm)

## Product

- Register / Login with JWT auth
- Dashboard: storage stats, algorithm distribution chart, recent activity feed
- File Vault: drag-and-drop upload, search/filter, rename/delete
- Encrypt: pick file + algorithm (AES-256, RSA, Caesar, Vigenere, Rail Fence, SHA-256, Hybrid AES+RSA) + key + output format (.enc / .cipher / .locked)
- Decrypt: enter key to restore original file, download decrypted result
- Activity History: full audit log of all operations
- Profile: storage quota visualization

## Demo account

- Email: `demo@cipherdrive.io`
- Password: `Demo1234!`

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Always run `pnpm run typecheck:libs` after changing DB schema before running API server typecheck
- bcrypt (native) is blocked by pnpm build scripts; use bcryptjs (pure JS) instead
- Multipart file upload endpoints cannot be in the OpenAPI spec (Orval generates `File`/`Blob` types that fail in Node context); handle uploads with raw fetch/multer instead
- File upload on frontend uses XMLHttpRequest (not fetch) for real upload progress tracking

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
