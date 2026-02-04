/**
 * @utmessa/shared - Shared contracts and schemas
 * Single source of truth for types across Intake, Orchestrator, and Dashboard.
 *
 * @packageDocumentation
 */

// =============================================================================
// Event Schemas Export
// =============================================================================

export {
  // Base Schema
  BaseEventSchema,

  // Job Event Schemas
  JobCreatedEventSchema,
  JobStartedEventSchema,
  JobFailedEventSchema,
  JobDoneEventSchema,

  // Feature Event Schemas
  FeaturesPlannedEventSchema,
  FeatureStartedEventSchema,
  FeatureDoneEventSchema,
  FeatureFailedEventSchema,
  FeatureSkippedEventSchema,

  // HITL Event Schemas
  WaitingForInputEventSchema,
  InputReceivedEventSchema,

  // Deployment Event Schemas
  DeployStartedEventSchema,
  DeployDoneEventSchema,
  RepoPublishedEventSchema,

  // Test Event Schemas
  TestsStartedEventSchema,
  TestsPassedEventSchema,
  TestsFailedEventSchema,

  // Union Schema
  BoothEventSchema,
} from './schemas/events';

// =============================================================================
// Type Exports
// =============================================================================

export type {
  // Base Type
  BaseEvent,

  // Job Event Types
  JobCreatedEvent,
  JobStartedEvent,
  JobFailedEvent,
  JobDoneEvent,

  // Feature Event Types
  FeaturesPlannedEvent,
  FeatureStartedEvent,
  FeatureDoneEvent,
  FeatureFailedEvent,
  FeatureSkippedEvent,

  // HITL Event Types
  WaitingForInputEvent,
  InputReceivedEvent,

  // Deployment Event Types
  DeployStartedEvent,
  DeployDoneEvent,
  RepoPublishedEvent,

  // Test Event Types
  TestsStartedEvent,
  TestsPassedEvent,
  TestsFailedEvent,

  // Union Types
  BoothEvent,
  BoothEventType,
} from './schemas/events';

// =============================================================================
// File Format Schemas Export
// =============================================================================

export {
  // Project File Schema
  ProjectFileSchema,

  // Features File Schema
  FeaturesFileSchema,
  FeatureItemSchema,

  // State File Schema
  StateFileSchema,
  // Note: ProjectRunStatus schema is now exported from ./api/orchestrator as ProjectRunStatusSchema

  // Validation Functions
  validateProjectFile,
  validateFeaturesFile,
  validateStateFile,
} from './schemas/files';

// =============================================================================
// File Format Type Exports
// =============================================================================

export type {
  // Project File Types
  ProjectFile,

  // Features File Types
  FeaturesFile,
  FeatureItem,

  // State File Types
  StateFile,
  ProjectRunStatusType,
} from './schemas/files';

// =============================================================================
// Idea Schemas Export (F1)
// =============================================================================

export {
  // Idea Schema
  IdeaSchema,
  IdeaStatusSchema,
  IDEA_STATUSES,

  // Validation Functions
  validateIdea,
  safeValidateIdea,
} from './schemas/idea';

// =============================================================================
// Idea Type Exports
// =============================================================================

export type {
  // Idea Types
  Idea,
  IdeaStatus,
} from './schemas/idea';

// =============================================================================
// Feature Schemas Export (F1)
// =============================================================================

export {
  // Feature Schema
  FeatureSchema,
  FeatureStatusSchema,
  FEATURE_STATUSES,
  FeaturePrioritySchema,
  FEATURE_PRIORITIES,

  // Validation Functions
  validateFeature,
  safeValidateFeature,
} from './schemas/feature';

// =============================================================================
// Feature Type Exports
// =============================================================================

export type {
  // Feature Types
  Feature,
  FeatureStatus,
  FeaturePriority,
} from './schemas/feature';

// =============================================================================
// Intake API DTOs Export (F5)
// =============================================================================

export {
  // Public Idea Type
  PublicIdeaSchema,

  // Public Endpoint DTOs
  SubmitIdeaRequestSchema,
  SubmitIdeaResponseSchema,
  GetIdeaResponseSchema,

  // Protected Endpoint DTOs
  ListIdeasQuerySchema,
  ListIdeasResponseSchema,
  ClaimIdeaRequestSchema,
  ClaimIdeaResponseSchema,
  UpdateIdeaRequestSchema,
  UpdateIdeaResponseSchema,
  UpsertFeaturesRequestSchema,
  UpsertFeaturesResponseSchema,
} from './api/intake';

// =============================================================================
// Intake API Type Exports
// =============================================================================

export type {
  // Public Types
  PublicIdea,

  // Public Endpoint Types
  SubmitIdeaRequest,
  SubmitIdeaResponse,
  GetIdeaResponse,

  // Protected Endpoint Types
  ListIdeasQuery,
  ListIdeasResponse,
  ClaimIdeaRequest,
  ClaimIdeaResponse,
  UpdateIdeaRequest,
  UpdateIdeaResponse,
  UpsertFeaturesRequest,
  UpsertFeaturesResponse,
} from './api/intake';

// =============================================================================
// Orchestrator API DTOs Export (F6)
// =============================================================================

export {
  // Queue DTOs
  QueueItemSchema,
  QueueResponseSchema,

  // Start POC DTOs
  StartPocResponseSchema,
  StartPocErrorSchema,
  StartPocResultSchema,

  // Projects List DTOs
  ProjectRunStatusSchema,
  PROJECT_RUN_STATUSES,
  ProjectSummarySchema,
  ProjectsListResponseSchema,

  // Project Detail DTOs
  ProgressDetailSchema,
  ProjectStateSchema,
  ProjectDetailSchema,

  // SSE Event DTOs
  StateChangeEventSchema,
  NewEventEventSchema,
  SSEEventSchema,

  // Answer DTOs
  AnswerRequestSchema,
  AnswerResponseSchema,

  // Manual Override DTOs
  ManualOverrideActionSchema,
  MANUAL_OVERRIDE_ACTIONS,
  ManualOverrideRequestSchema,
  ManualOverrideResponseSchema,
} from './api/orchestrator';

// =============================================================================
// Orchestrator API Type Exports
// =============================================================================

export type {
  // Queue Types
  QueueItem,
  QueueResponse,

  // Start POC Types
  StartPocResponse,
  StartPocError,
  StartPocResult,

  // Projects List Types
  ProjectRunStatus,
  ProjectSummary,
  ProjectsListResponse,

  // Project Detail Types
  ProgressDetail,
  ProjectState,
  ProjectDetail,

  // SSE Event Types
  StateChangeEvent,
  NewEventEvent,
  SSEEvent,

  // Answer Types
  AnswerRequest,
  AnswerResponse,

  // Manual Override Types
  ManualOverrideAction,
  ManualOverrideRequest,
  ManualOverrideResponse,
} from './api/orchestrator';

// =============================================================================
// State Computation Export (F4)
// =============================================================================

export {
  // Main computation function
  computeProjectState,

  // Individual computation functions
  computeStatus,
  computeProgress,
  computeProgressDetail,
  findCurrentFeature,
  findWaitingQuestion,

  // Helper functions
  findEvent,
  findMostRecentEvent,
  findEventAfter,
  findMostRecentInArray,
  isFeatureComplete,
  isCompletionEvent,
  extractDeploymentUrls,
} from './state';

// =============================================================================
// State Computation Type Exports
// =============================================================================

// Note: ProjectState and ProgressDetail types are already exported from ./api/orchestrator
// The state module's interfaces are compatible with the API schemas
export type { DeploymentUrls } from './state/helpers';
