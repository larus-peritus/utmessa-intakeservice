import { pgTable, uuid, varchar, text, jsonb, integer, timestamp, index } from 'drizzle-orm/pg-core';

/**
 * Ideas table schema for the Intake service
 *
 * Stores all POC ideas submitted via the public form.
 * Ideas progress through states: submitted → ready → claimed → running → waiting → deployed/failed/abandoned
 */
export const ideas = pgTable(
  'ideas',
  {
    // Primary key - UUID for global uniqueness
    id: uuid('id').primaryKey().defaultRandom(),

    // Receipt token - unguessable, URL-safe identifier for public access
    // 21 characters using nanoid with custom alphabet (~121 bits entropy)
    token: varchar('token', { length: 21 }).notNull().unique(),

    // Core idea fields
    title: varchar('title', { length: 200 }).notNull(),
    problem: text('problem').notNull(),
    mustHaves: jsonb('must_haves').notNull().$type<string[]>(),

    // Optional contact email for notifications
    email: varchar('email', { length: 254 }),

    // Status tracking
    // submitted | ready | claimed | running | waiting | deployed | failed | abandoned
    status: varchar('status', { length: 50 }).notNull().default('submitted'),

    // Progress tracking (0-100 percentage)
    progress: integer('progress'),

    // Current activity description
    currentStep: text('current_step'),

    // Current feature being built
    currentFeature: varchar('current_feature', { length: 100 }),

    // Question for submitter when status=waiting
    waitingQuestion: text('waiting_question'),

    // Deployment URLs
    demoUrl: text('demo_url'),
    repoUrl: text('repo_url'),

    // Orchestrator claim tracking
    claimedBy: varchar('claimed_by', { length: 100 }),
    claimedAt: timestamp('claimed_at', { withTimezone: true }),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }),
  },
  (table) => ({
    // Index for receipt token lookups (public access)
    tokenIdx: index('idx_ideas_token').on(table.token),

    // Index for status filtering (orchestrator queue)
    statusIdx: index('idx_ideas_status').on(table.status),

    // Index for chronological listing
    createdAtIdx: index('idx_ideas_created_at').on(table.createdAt),
  })
);

/**
 * Feature tracking table for individual features within an idea
 * Used for detailed progress display on receipt page
 */
export const features = pgTable(
  'features',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    // Reference to parent idea
    ideaId: uuid('idea_id')
      .notNull()
      .references(() => ideas.id, { onDelete: 'cascade' }),

    // Feature identifier (e.g., "F1", "F2")
    featureId: varchar('feature_id', { length: 50 }).notNull(),

    // Feature title
    title: varchar('title', { length: 200 }).notNull(),

    // Feature status: planned | in_progress | done | failed | skipped
    status: varchar('status', { length: 50 }).notNull().default('planned'),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }),
  },
  (table) => ({
    // Index for idea-feature relationship
    ideaIdIdx: index('idx_features_idea_id').on(table.ideaId),
  })
);
