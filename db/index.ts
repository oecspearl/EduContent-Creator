import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "@shared/schema";

const isVercel = !!process.env.VERCEL;

let pool: Pool | null = null;
let dbInstance: ReturnType<typeof drizzle> | null = null;

if (process.env.DATABASE_URL) {
  const isSupabase = process.env.DATABASE_URL.includes("supabase");
  const isNeon = process.env.DATABASE_URL.includes("neon");

  let connectionString = process.env.DATABASE_URL.replace(/[?&]sslmode=[^&]*/g, '');

  // Single shared pool — keep small on serverless to avoid exhausting Supabase pooler
  pool = new Pool({
    connectionString: connectionString,
    ssl: (isSupabase || isNeon) ? {
      rejectUnauthorized: false
    } : false,
    max: isVercel ? 1 : 20,
    idleTimeoutMillis: isVercel ? 5000 : 30000,
    connectionTimeoutMillis: 10000,
  });

  pool.on('error', (err) => {
    console.error('Unexpected error on idle PostgreSQL client', err);
  });

  dbInstance = drizzle(pool, { schema });

  console.log(`✓ Database pool created (max: ${isVercel ? 1 : 20})`);
  if (isSupabase) console.log('✓ Using Supabase PostgreSQL');
  else if (isNeon) console.log('✓ Using Neon PostgreSQL');
  else console.log('✓ Using PostgreSQL');
} else {
  console.warn('⚠ DATABASE_URL is not set. Database operations will not work.');
}

// Export db with a getter that throws if not initialized
export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(_target, prop) {
    if (!dbInstance) {
      throw new Error(
        'DATABASE_URL is not set. Please add DATABASE_URL to your .env file.\n' +
        'Get a free PostgreSQL database from:\n' +
        '  - Neon: https://neon.tech\n' +
        '  - Supabase: https://supabase.com\n' +
        'Or use a local PostgreSQL instance.'
      );
    }
    return (dbInstance as any)[prop];
  }
});

// Export pool for cleanup if needed
export { pool };
