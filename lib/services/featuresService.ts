import { eq, and } from 'drizzle-orm';
import { db } from '../db';
import { ideas, features } from '../db/schema';
import type { Feature } from '@utmessa/shared';

/**
 * Error types for features operations
 */
export type FeaturesError =
  | { type: 'NOT_FOUND'; ideaId: string }
  | { type: 'DATABASE_ERROR'; message: string };

/**
 * Result type for upsert features operations
 */
export type UpsertFeaturesResult =
  | { success: true; ideaId: string; featuresCount: number }
  | { success: false; error: FeaturesError };

/**
 * Upsert features for an idea
 *
 * Performs validation:
 * 1. Idea must exist
 * 2. Features are inserted or updated based on (ideaId, featureId) uniqueness
 *
 * Process:
 * - Uses transaction for atomicity
 * - Deletes existing features for the idea
 * - Inserts new features in batch
 *
 * @param ideaId - UUID of the parent idea
 * @param featuresList - Array of features to upsert
 * @returns Result with success status or error
 *
 * @example
 * ```typescript
 * const result = await upsertFeatures(ideaId, [
 *   { id: 'uuid-1', ideaId, featureId: 'F1', title: 'Auth', status: 'planned' },
 *   { id: 'uuid-2', ideaId, featureId: 'F2', title: 'Dashboard', status: 'in_progress' },
 * ]);
 * ```
 */
export async function upsertFeatures(
  ideaId: string,
  featuresList: Feature[]
): Promise<UpsertFeaturesResult> {
  try {
    // 1. Verify idea exists
    const [idea] = await db
      .select({ id: ideas.id })
      .from(ideas)
      .where(eq(ideas.id, ideaId))
      .limit(1);

    if (!idea) {
      console.log('[FeaturesService] Idea not found', { ideaId });
      return {
        success: false,
        error: { type: 'NOT_FOUND', ideaId },
      };
    }

    // 2. Execute upsert in transaction
    // Strategy: Delete all existing features for this idea, then insert new ones
    // This is simpler than individual upserts and works well for our use case
    await db.transaction(async (tx) => {
      // Delete existing features
      await tx.delete(features).where(eq(features.ideaId, ideaId));

      // Insert new features if any
      if (featuresList.length > 0) {
        // Map Feature type to database schema format
        const featuresToInsert = featuresList.map((feature) => ({
          id: feature.id,
          ideaId: feature.ideaId,
          featureId: feature.featureId,
          title: feature.title,
          status: feature.status,
          createdAt: new Date(),
          updatedAt: new Date(),
        }));

        await tx.insert(features).values(featuresToInsert);
      }
    });

    console.log('[FeaturesService] Features upserted successfully', {
      ideaId,
      count: featuresList.length,
    });

    return {
      success: true,
      ideaId,
      featuresCount: featuresList.length,
    };
  } catch (error) {
    console.error('[FeaturesService] Database error during upsert', {
      ideaId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return {
      success: false,
      error: {
        type: 'DATABASE_ERROR',
        message: error instanceof Error ? error.message : 'Unknown database error',
      },
    };
  }
}

/**
 * Get features for an idea
 *
 * @param ideaId - UUID of the idea
 * @returns Array of features for the idea
 *
 * @example
 * ```typescript
 * const features = await getFeaturesByIdeaId('550e8400-...');
 * ```
 */
export async function getFeaturesByIdeaId(ideaId: string): Promise<Feature[]> {
  const result = await db
    .select()
    .from(features)
    .where(eq(features.ideaId, ideaId))
    .orderBy(features.createdAt);

  return result.map((f) => ({
    id: f.id,
    ideaId: f.ideaId,
    featureId: f.featureId,
    title: f.title,
    status: f.status as Feature['status'],
  }));
}

/**
 * Delete all features for an idea
 *
 * Useful for cleanup operations.
 *
 * @param ideaId - UUID of the idea
 * @returns Number of features deleted (or 0 if count unavailable)
 *
 * @example
 * ```typescript
 * const deleted = await deleteFeaturesByIdeaId('550e8400-...');
 * console.log(`Deleted ${deleted} features`);
 * ```
 */
export async function deleteFeaturesByIdeaId(ideaId: string): Promise<number> {
  // Drizzle's delete operation doesn't return a count by default
  // We need to first fetch the count, then delete
  const existing = await db
    .select({ id: features.id })
    .from(features)
    .where(eq(features.ideaId, ideaId));

  const count = existing.length;

  if (count > 0) {
    await db.delete(features).where(eq(features.ideaId, ideaId));
  }

  console.log('[FeaturesService] Features deleted', {
    ideaId,
    count,
  });

  return count;
}
