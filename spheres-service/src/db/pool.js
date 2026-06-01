import pg from "pg";
const { Pool, types } = pg;

// Return BIGINT (int8) as JS number instead of string.
// User IDs are well within safe integer range.
types.setTypeParser(20, Number);

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on("error", (err) => {
  console.error("[db] Unexpected pool error", err);
});
