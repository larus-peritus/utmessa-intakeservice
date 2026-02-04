import { db } from '../db/client';
import { ideas } from '../db/schema';
import { inArray, asc, desc, sql, count } from 'drizzle-orm';
import type { IdeaStatus } from '@utmessa/shared';
import type { QueueItem } from '@utmessa/shared';

/**
 * Query parameters for listing ideas
 */
export interface ListIdeasQuery {
  statuses: IdeaStatus[];
  limit: number;
  offset: number;
  sort: 'createdAt';
  order: 'asc' | 'desc';
}

/**
 * Result of listing ideas with pagination metadata
 */
export interface ListIdeasResult {
  ideas: QueueItem[];
  total: number;
  limit: number;
  offset: number;
}

/**
 * List ideas from the database with filtering, sorting, and pagination.
 *
 * This function is used by the GET /api/ideas endpoint to serve the queue API.
 * It excludes sensitive fields (email, token) from the response.
 *
 * @param query - Validated query parameters
 * @returns Paginated list of ideas with total count
 *
 * @example
 * ```typescript
 * const result = await listIdeas({
 *   statuses: ['submitted', 'ready'],
 *   limit: 50,
 *   offset: 0,
 *   sort: 'createdAt',
 *   order: 'asc'
 * });
 * // result.ideas = QueueItem[]
 * // result.total = 100
 * ```
 */
export async function listIdeas(query: ListIdeasQuery): Promise<ListIdeasResult> {
  const { statuses, limit, offset, sort, order } = query;

  // Validation: statuses array must not be empty
  if (statuses.length === 0) {
    throw new Error('Status filter cannot be empty');
  }

  try {
    // Execute count and data queries in parallel for efficiency
    const orderFn = order === 'asc' ? asc : desc;

    const [countResult, dataResult] = await Promise.all([
      // Count total matching records (before pagination)
      db
        .select({ count: count() })
        .from(ideas)
        .where(inArray(ideas.status, statuses)),

      // Query data with pagination
      // IMPORTANT: Whitelist only public fields (exclude email, token)
      db
        .select({
          id: ideas.id,
          title: ideas.title,
          problem: ideas.problem,
          mustHaves: ideas.mustHaves,
          status: ideas.status,
          createdAt: ideas.createdAt,
        })
        .from(ideas)
        .where(inArray(ideas.status, statuses))
        .orderBy(orderFn(ideas[sort]))
        .limit(limit)
        .offset(offset),
    ]);

    const total = countResult[0]?.count ?? 0;

    // Map to QueueItem with ISO timestamps
    const queueItems: QueueItem[] = dataResult.map((row) => ({
      id: row.id,
      title: row.title,
      problem: row.problem,
      mustHaves: row.mustHaves ?? undefined,
      status: row.status as 'submitted' | 'ready',
      createdAt: row.createdAt.toISOString(),
    }));

    return {
      ideas: queueItems,
      total,
      limit,
      offset,
    };
  } catch (error) {
    console.error('[IdeasService] List ideas error:', error);
    throw new Error('Failed to list ideas from database');
  }
}
