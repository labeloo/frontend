import type { ReviewStatus } from './reviews'

/**
 * Task status types
 */
export type TaskStatus = 'unassigned' | 'annotating' | 'in_review' | 'changes_needed' | 'completed'

/**
 * Base task interface representing a data item to be annotated
 */
export interface Task {
  id: number
  projectId: number
  dataUrl: string
  dataType: string
  status: TaskStatus
  assignedTo: number | null
  metadata: string
  priority: number
  createdAt: number
  updatedAt: number
}

/**
 * Task with review-related fields (populated from API when available)
 */
export interface TaskWithReview extends Task {
  /** Current review status if task is in review workflow */
  reviewStatus?: ReviewStatus
  /** ID of the assigned reviewer */
  reviewerId?: number
  /** Email of the assigned reviewer */
  reviewerEmail?: string
  /** Whether the task was auto-approved */
  isAutoApproved?: boolean
  /** Current review round number */
  reviewRound?: number
  /** Whether the current user is the assigned reviewer */
  isCurrentUserReview?: boolean
}

/**
 * Task creation payload
 */
export interface CreateTaskPayload {
  projectId: number
  dataUrl: string
  dataType: string
  metadata?: string
  priority?: number
}

/**
 * Task update payload
 */
export interface UpdateTaskPayload {
  status?: TaskStatus
  assignedTo?: number | null
  metadata?: string
  priority?: number
}

/**
 * Task assignment payload
 */
export interface TaskAssignmentPayload {
  taskId: number
  userId: number
}

/**
 * Paginated tasks response
 */
export interface PaginatedTasks {
  tasks: TaskWithReview[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

/**
 * Task statistics for dashboard display
 */
export interface TaskStatistics {
  total: number
  unassigned: number
  annotating: number
  inReview: number
  changesNeeded: number
  completed: number
  /** Auto-approved count */
  autoApproved: number
  /** Pending my review count */
  pendingMyReview: number
}

/**
 * Get task status label for display
 */
export function getTaskStatusLabel(status: TaskStatus): string {
  const labels: Record<TaskStatus, string> = {
    unassigned: 'Unassigned',
    annotating: 'In Progress',
    in_review: 'In Review',
    changes_needed: 'Changes Needed',
    completed: 'Completed'
  }
  return labels[status]
}

/**
 * Get task status color for UI components
 */
export function getTaskStatusColor(status: TaskStatus): string {
  const colors: Record<TaskStatus, string> = {
    unassigned: 'neutral',
    annotating: 'info',
    in_review: 'warning',
    changes_needed: 'error',
    completed: 'success'
  }
  return colors[status]
}

/**
 * Get task status icon
 */
export function getTaskStatusIcon(status: TaskStatus): string {
  const icons: Record<TaskStatus, string> = {
    unassigned: 'i-heroicons-user-minus',
    annotating: 'i-heroicons-pencil-square',
    in_review: 'i-heroicons-clock',
    changes_needed: 'i-heroicons-exclamation-triangle',
    completed: 'i-heroicons-check-circle'
  }
  return icons[status]
}

/**
 * Check if a task can be submitted for review
 */
export function canSubmitForReview(task: Task): boolean {
  return task.status === 'annotating' || task.status === 'changes_needed'
}

/**
 * Check if a task is in the review workflow
 */
export function isInReviewWorkflow(task: Task): boolean {
  return task.status === 'in_review' || 
         task.status === 'changes_needed' || 
         task.status === 'completed'
}
