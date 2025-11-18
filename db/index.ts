import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "@shared/schema";

let pool: Pool | null = null;
let dbInstance: ReturnType<typeof drizzle> | null = null;

if (process.env.DATABASE_URL) {
  // Determine if we're using Supabase or Neon (both need SSL)
  const isSupabase = process.env.DATABASE_URL.includes("supabase");
  const isNeon = process.env.DATABASE_URL.includes("neon");
  
  // Remove sslmode from connection string - we'll handle SSL in Pool config
  let connectionString = process.env.DATABASE_URL.replace(/[?&]sslmode=[^&]*/g, '');
  
  // Create PostgreSQL connection pool (works with Supabase, Neon, and local PostgreSQL)
  pool = new Pool({
    connectionString: connectionString,
    ssl: (isSupabase || isNeon) ? { 
      rejectUnauthorized: false 
    } : false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });
  
  // Handle pool errors
  pool.on('error', (err) => {
    console.error('Unexpected error on idle PostgreSQL client', err);
  });
  
  // Create Drizzle instance with node-postgres (compatible with all PostgreSQL databases)
  dbInstance = drizzle(pool, { schema });
  
  console.log('✓ Database connection pool created');
  if (isSupabase) {
    console.log('✓ Using Supabase PostgreSQL database');
  } else if (isNeon) {
    console.log('✓ Using Neon PostgreSQL database');
  } else {
    console.log('✓ Using PostgreSQL database');
  }
} else {
  console.warn('⚠ DATABASE_URL is not set. Database operations will not work.');
  console.warn('⚠ For full functionality, set DATABASE_URL in your .env file.');
  console.warn('⚠ The app will use memory session store, but data will not persist.');
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
