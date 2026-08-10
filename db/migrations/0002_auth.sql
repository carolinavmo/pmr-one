-- ============================================================
-- PM&R Atlas — Migration 0002 — Identity & Role Foundation
-- Additive layer, does not modify the frozen Knowledge Graph
-- (schema-v1.0.sql) except giving disease.reviewed_by a real FK
-- target — that column already existed as an explicitly-deferred
-- stub ("FK to editorial user, deferred").
--
-- Table shape (users/accounts/sessions/verification_token) follows
-- the Auth.js Postgres adapter's expected schema (@auth/pg-adapter)
-- so we can use the adapter as-is rather than writing a custom one
-- — camelCase columns are quoted because Auth.js's generated SQL
-- references them exactly as written here. Primary keys use UUID
-- (gen_random_uuid()) to stay consistent with the rest of the
-- schema, rather than the adapter's SERIAL-based reference example.
--
-- Three user types (product decision, not yet in spec doc):
--   visitor   — unauthenticated, no row
--   member    — registered user, owns Personal Graph objects (Phase 2)
--   editor    — can author/publish Editorial Graph content
--   admin     — editor privileges + manage other editors
-- ============================================================

CREATE TYPE user_role AS ENUM ('member', 'editor', 'admin');

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  email TEXT UNIQUE,
  "emailVerified" TIMESTAMPTZ,
  image TEXT,
  role user_role NOT NULL DEFAULT 'member',
  password_hash TEXT,  -- nullable: only set for credentials-based accounts
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(255) NOT NULL,
  provider VARCHAR(255) NOT NULL,
  "providerAccountId" VARCHAR(255) NOT NULL,
  refresh_token TEXT,
  access_token TEXT,
  expires_at BIGINT,
  id_token TEXT,
  scope TEXT,
  session_state TEXT,
  token_type TEXT,
  UNIQUE (provider, "providerAccountId")
);

CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires TIMESTAMPTZ NOT NULL,
  "sessionToken" VARCHAR(255) NOT NULL UNIQUE
);

CREATE TABLE verification_token (
  identifier TEXT NOT NULL,
  expires TIMESTAMPTZ NOT NULL,
  token TEXT NOT NULL,
  PRIMARY KEY (identifier, token)
);

CREATE INDEX accounts_user_id_idx ON accounts ("userId");
CREATE INDEX sessions_user_id_idx ON sessions ("userId");

-- Give the pre-existing stub column a real target (schema-v1.0.sql,
-- disease.reviewed_by was left as a bare UUID with no FK "deferred").
ALTER TABLE disease
  ADD CONSTRAINT disease_reviewed_by_fkey
  FOREIGN KEY (reviewed_by) REFERENCES users(id);
