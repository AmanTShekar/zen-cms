/**
 * Zenith Workflow State Machine
 * ──────────────────────────────
 * Defines and validates all workflow state transitions with role-based guards.
 * State graph:
 *
 *   draft ── in_review ── changes_requested ◀──┐
 *     ▲         │                │               │
 *     └─────────┴────────────────┴───────────────┤
 *     (unpublish / request changes → draft)       │
 *           │              │                      │
 *           └──────────────┴────── published ──┘
 *
 * Roles: view_user < editor < admin
 * - view_user: can only submit (draft → in_review)
 * - editor: can submit and approve (→ published / changes_requested)
 * - admin: unlimited
 */
export type WorkflowStatus = 'draft' | 'in_review' | 'changes_requested' | 'scheduled' | 'published'

export interface WorkflowTransition {
  from: WorkflowStatus
  to: WorkflowStatus
  minRole: 'viewer' | 'editor' | 'admin'
  label: string
}

// All valid transitions sorted by from→to
const TRANSITIONS: WorkflowTransition[] = [
  // Draft → active states
  { from: 'draft',               to: 'in_review',         minRole: 'editor', label: 'Submit for review' },
  { from: 'draft',               to: 'published',          minRole: 'admin', label: 'Publish directly' },
  { from: 'draft',               to: 'scheduled',          minRole: 'admin', label: 'Schedule' },
  // In-review → outcomes
  { from: 'in_review',           to: 'published',          minRole: 'admin', label: 'Approve & publish' },
  { from: 'in_review',           to: 'changes_requested',  minRole: 'editor', label: 'Request changes' },
  { from: 'in_review',           to: 'draft',              minRole: 'editor', label: 'Return to draft' },
  // Changes requested → resolution
  { from: 'changes_requested',   to: 'in_review',          minRole: 'editor', label: 'Re-submit' },
  { from: 'changes_requested',   to: 'draft',              minRole: 'editor', label: 'Cancel' },
  // Scheduled → outcomes
  { from: 'scheduled',           to: 'published',           minRole: 'admin', label: 'Publish now' },
  { from: 'scheduled',           to: 'draft',               minRole: 'editor', label: 'Unschedule' },
  // Published → archive
  { from: 'published',           to: 'draft',              minRole: 'admin', label: 'Unpublish' },
  { from: 'published',           to: 'scheduled',          minRole: 'admin', label: 'Re-schedule' },
]

const ROLE_ORDER = { viewer: 0, editor: 1, admin: 2 }

export interface TransitionResult {
  valid: boolean
  reason?: string
}

/** Returns all valid next states from the current workflow status */
export function getAvailableTransitions(
  currentStatus: WorkflowStatus,
  userRole: 'viewer' | 'editor' | 'admin' = 'editor'
): { to: WorkflowStatus; label: string }[] {
  return TRANSITIONS
    .filter(
      (t) =>
        t.from === currentStatus &&
        ROLE_ORDER[t.minRole] <= ROLE_ORDER[userRole]
    )
    .map(({ to, label }) => ({ to, label }))
}

/** Validate whether a single status transition is permitted for a given user role */
export function canTransition(
  from: WorkflowStatus,
  to: WorkflowStatus,
  userRole: 'viewer' | 'editor' | 'admin' = 'admin'
): TransitionResult {
  if (from === to) {
    return { valid: false, reason: 'Status is already set to this value' }
  }

  const transition = TRANSITIONS.find((t) => t.from === from && t.to === to)
  if (!transition) {
    return {
      valid: false,
      reason: `Transition from "${from}" → "${to}" is not allowed`,
    }
  }

  if (ROLE_ORDER[userRole] < ROLE_ORDER[transition.minRole]) {
    return {
      valid: false,
      reason: `Role "${userRole}" cannot perform "${transition.label}" (requires "${transition.minRole}")`,
    }
  }

  return { valid: true }
}

/** Parse inline role header into role string */
export function roleFromString(role: string | undefined): 'viewer' | 'editor' | 'admin' {
  if (role === 'viewer' || role === 'editor' || role === 'admin') return role
  return 'editor' // default to editor for missing role
}