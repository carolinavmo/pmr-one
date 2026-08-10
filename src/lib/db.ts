import { Pool, types } from "pg";

// pg's default DATE (OID 1082) parser builds a Date via local-time
// `new Date(y, m, d)`, not UTC — so a later `.toISOString()` shifts
// the calendar date backward by a day in any timezone ahead of UTC
// (e.g. Europe/Lisbon in summer). Returning the raw "YYYY-MM-DD"
// string instead sidesteps the ambiguity entirely — nothing in this
// codebase needs a DATE column as a JS Date object.
types.setTypeParser(1082, (value) => value);

declare global {
  var pgPool: Pool | undefined;
}

export const pool =
  global.pgPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
  });

if (process.env.NODE_ENV !== "production") {
  global.pgPool = pool;
}
