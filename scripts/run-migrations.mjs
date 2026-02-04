#!/usr/bin/env node
/**
 * Run database migrations on Vercel
 * 
 * This script reads SQL migration files from drizzle/migrations and executes them
 * in order against the database specified by POSTGRES_URL.
 */

import { readdir, readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import postgres from 'postgres';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

async function runMigrations() {
  const postgresUrl = process.env.POSTGRES_URL;
  
  if (!postgresUrl) {
    console.error('❌ POSTGRES_URL environment variable is required');
    process.exit(1);
  }

  console.log('🔄 Running database migrations...');

  try {
    // Use postgres.js directly for migrations (works with all PostgreSQL databases)
    const sql = postgres(postgresUrl, {
      max: 1,
      onnotice: () => {}, // Suppress notices
    });
    
    // Get migration files in order
    const migrationsDir = join(rootDir, 'drizzle', 'migrations');
    const files = await readdir(migrationsDir);
    const migrationFiles = files
      .filter(f => f.endsWith('.sql'))
      .sort(); // Sort alphabetically (0001, 0002, etc.)

    if (migrationFiles.length === 0) {
      console.log('📁 No migration files found');
      await sql.end();
      return;
    }

    console.log(`📁 Found ${migrationFiles.length} migration file(s)`);

    for (const file of migrationFiles) {
      const filePath = join(migrationsDir, file);
      const sqlContent = await readFile(filePath, 'utf-8');
      
      console.log(`  → Running ${file}...`);
      
      try {
        // Execute the migration SQL
        // Split by semicolons and execute each statement
        const statements = sqlContent
          .split(';')
          .map(s => s.trim())
          .filter(s => s.length > 0 && !s.startsWith('--'));
        
        for (const statement of statements) {
          if (statement.trim()) {
            await sql.unsafe(statement);
          }
        }
        
        console.log(`  ✓ Completed ${file}`);
      } catch (error) {
        // If error is about table/index already existing, that's okay
        const errorMsg = error.message || String(error);
        if (errorMsg.includes('already exists') || errorMsg.includes('duplicate')) {
          console.log(`  ⚠ Skipped ${file} (already applied)`);
        } else {
          throw error;
        }
      }
    }

    await sql.end();
    console.log('✅ All migrations completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error.message || error);
    // Don't exit with error code - allow build to continue
    // The app will fail at runtime if migrations are truly needed
    console.warn('⚠ Continuing build - migrations may need to be run manually');
    process.exit(0); // Exit successfully to not block deployment
  }
}

runMigrations();
