import { db } from './client';
import { ideas } from './schema';
import { eq } from 'drizzle-orm';
import type { Idea, NewIdea } from './types';

/**
 * Create a new idea in the database
 *
 * @param data - The idea data to insert
 * @returns The created idea with generated id and timestamps
 *
 * @example
 * ```typescript
 * const idea = await createIdea({
 *   token: 'V1StGXR8Z5jdHi9B2vBJ4',
 *   title: 'Recipe sharing app',
 *   problem: 'Need a way to share family recipes',
 *   mustHaves: ['User authentication', 'Recipe search'],
 *   email: 'user@example.com',
 *   status: 'submitted',
 * });
 * ```
 */
export async function createIdea(data: NewIdea): Promise<Idea> {
  const [idea] = await db
    .insert(ideas)
    .values({
      ...data,
      createdAt: new Date(),
    })
    .returning();

  return idea;
}

/**
 * Retrieve an idea by its receipt token
 *
 * @param token - The receipt token (21-character nanoid)
 * @returns The idea if found, or null if not found
 *
 * @example
 * ```typescript
 * const idea = await getIdeaByToken('V1StGXR8Z5jdHi9B2vBJ4');
 * if (idea) {
 *   console.log(idea.title);
 * }
 * ```
 */
export async function getIdeaByToken(token: string): Promise<Idea | null> {
  const [idea] = await db
    .select()
    .from(ideas)
    .where(eq(ideas.token, token))
    .limit(1);

  return idea || null;
}

/**
 * Retrieve an idea by its UUID
 *
 * @param id - The idea UUID
 * @returns The idea if found, or null if not found
 */
export async function getIdeaById(id: string): Promise<Idea | null> {
  const [idea] = await db
    .select()
    .from(ideas)
    .where(eq(ideas.id, id))
    .limit(1);

  return idea || null;
}

/**
 * Update an idea's fields
 *
 * @param id - The idea UUID
 * @param data - Partial idea data to update
 * @returns The updated idea
 */
export async function updateIdea(
  id: string,
  data: Partial<Omit<Idea, 'id' | 'createdAt'>>
): Promise<Idea | null> {
  const [idea] = await db
    .update(ideas)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(ideas.id, id))
    .returning();

  return idea || null;
}

/**
 * List ideas by status
 *
 * @param status - The status to filter by
 * @returns Array of ideas with the given status
 */
export async function listIdeasByStatus(status: string): Promise<Idea[]> {
  return db
    .select()
    .from(ideas)
    .where(eq(ideas.status, status))
    .orderBy(ideas.createdAt);
}

/**
 * Delete an idea by its UUID
 *
 * @param id - The idea UUID
 * @returns True if the idea was deleted, false if not found
 *
 * @example
 * ```typescript
 * const deleted = await deleteIdea('550e8400-e29b-41d4-a716-446655440000');
 * if (deleted) {
 *   console.log('Idea deleted');
 * }
 * ```
 */
export async function deleteIdea(id: string): Promise<boolean> {
  const result = await db
    .delete(ideas)
    .where(eq(ideas.id, id))
    .returning({ id: ideas.id });

  return result.length > 0;
}
