import * as schema from './schema';

/**
 * Drizzle ORM client configured for PostgreSQL
 *
 * Automatically selects the appropriate database client based on environment:
 *
 * Supported providers (set via DB_PROVIDER env var or auto-detected):
 * - "neon"   : Neon serverless PostgreSQL (optimized for serverless, best cold starts)
 * - "vercel" : Vercel Postgres (optimized for Vercel deployment)
 * - "postgres" : Standard postgres.js client (local development, any PostgreSQL)
 *
 * Auto-detection priority:
 * 1. DB_PROVIDER env var (explicit override)
 * 2. Connection string pattern (*.neon.tech → neon)
 * 3. VERCEL=1 env var → vercel
 * 4. Default → postgres (standard client)
 *
 * Environment variables:
 * - POSTGRES_URL (required): PostgreSQL connection string
 * - DB_PROVIDER (optional): Force specific provider ("neon" | "vercel" | "postgres")
 */

type DbProvider = 'neon' | 'vercel' | 'postgres';

const connectionString = process.env.POSTGRES_URL;

if (!connectionString) {
  throw new Error('POSTGRES_URL environment variable is required');
}

/**
 * Detect the database provider from environment and connection string
 */
function detectProvider(): DbProvider {
  // 1. Explicit override via DB_PROVIDER
  const explicit = process.env.DB_PROVIDER?.toLowerCase();
  if (explicit === 'neon' || explicit === 'vercel' || explicit === 'postgres') {
    return explicit;
  }

  // 2. Auto-detect from connection string pattern
  if (connectionString!.includes('.neon.tech')) {
    return 'neon';
  }

  // 3. Vercel environment (VERCEL=1 is set automatically by Vercel)
  if (process.env.VERCEL === '1') {
    return 'vercel';
  }

  // 4. Default to standard postgres client
  return 'postgres';
}

const provider = detectProvider();

// Drizzle DB type - use postgres-js as the base type since all providers
// have compatible APIs for standard PostgreSQL operations
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

// Initialize clients based on detected provider
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let db: PostgresJsDatabase<typeof schema> & { [key: string]: any };
let sql: unknown; // Raw SQL client (type varies by provider)

if (provider === 'neon') {
  // Neon: Use @neondatabase/serverless with WebSocket for full PostgreSQL compatibility
  // Supports transactions, .returning() on all operations, etc.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { drizzle: drizzleNeonWs } = require('drizzle-orm/neon-serverless');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Pool, neonConfig } = require('@neondatabase/serverless');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const ws = require('ws');

  // Enable WebSocket support for Node.js environment
  neonConfig.webSocketConstructor = ws;

  const pool = new Pool({ connectionString });
  sql = pool;
  db = drizzleNeonWs(pool, { schema });

} else if (provider === 'vercel') {
  // Vercel Postgres: Use @vercel/postgres for Vercel-optimized connections
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { drizzle: drizzleVercel } = require('drizzle-orm/vercel-postgres');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { sql: sqlVercel } = require('@vercel/postgres');

  sql = sqlVercel;
  db = drizzleVercel(sql, { schema });

} else {
  // Standard postgres.js: Works with any PostgreSQL (local, Neon, Supabase, etc.)
  // Good for local development and when you don't need serverless optimizations
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { drizzle: drizzlePostgres } = require('drizzle-orm/postgres-js');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const postgres = require('postgres');

  const client = postgres(connectionString, {
    max: 1, // Limit connection pool for serverless-like behavior
  });

  sql = client;
  db = drizzlePostgres(client, { schema });
}

// Log provider on startup (only in development)
if (process.env.NODE_ENV === 'development') {
  console.log(`[db] Using provider: ${provider}`);
}

export { db, sql, provider };
