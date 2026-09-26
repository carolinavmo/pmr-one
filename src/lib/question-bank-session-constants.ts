// Split out from question-bank-session.ts so client components (the
// session panel, the sidebar's Practice rows, the folder page's
// "Practise this folder" button) can import these two plain constants
// without pulling in that file's `import { pool } from "@/lib/db"` —
// which drags the `pg` driver (net/fs/tls/dns) into the client bundle
// and breaks the build. question-bank-session.ts re-exports both so
// server code keeps a single source of truth.
export const DEFAULT_SESSION_SIZE = 20;
// "Estimated time = questions × 45s" (QBANK-IMPLEMENTATION.md Pass 2 —
// the same constant the deferred session panel will use once it's
// wired to this engine).
export const SECONDS_PER_QUESTION = 45;
