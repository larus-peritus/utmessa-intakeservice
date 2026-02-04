import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { ideas, features } from './schema';

/**
 * Type representing an idea row from the database
 */
export type Idea = InferSelectModel<typeof ideas>;

/**
 * Type for inserting a new idea into the database
 */
export type NewIdea = InferInsertModel<typeof ideas>;

/**
 * Type representing a feature row from the database
 */
export type Feature = InferSelectModel<typeof features>;

/**
 * Type for inserting a new feature into the database
 */
export type NewFeature = InferInsertModel<typeof features>;

/**
 * Idea status enum values
 */
export const IDEA_STATUS = {
  SUBMITTED: 'submitted',
  READY: 'ready',
  CLAIMED: 'claimed',
  RUNNING: 'running',
  WAITING: 'waiting',
  DEPLOYED: 'deployed',
  FAILED: 'failed',
  ABANDONED: 'abandoned',
} as const;

export type IdeaStatusValue = (typeof IDEA_STATUS)[keyof typeof IDEA_STATUS];

/**
 * Feature status enum values
 */
export const FEATURE_STATUS = {
  PLANNED: 'planned',
  IN_PROGRESS: 'in_progress',
  DONE: 'done',
  FAILED: 'failed',
  SKIPPED: 'skipped',
} as const;

export type FeatureStatusValue = (typeof FEATURE_STATUS)[keyof typeof FEATURE_STATUS];
