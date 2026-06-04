import { create } from 'zustand'

export type WorkflowStatus = 'draft' | 'in_review' | 'changes_requested' | 'scheduled' | 'published'
export type PublishStatus = 'draft' | 'published'

interface WorkflowState {
 workflowStatus: WorkflowStatus
 publishStatus: PublishStatus
 workflowReviewers: string[]
 scheduledAt: string
 workflowComments: any[]
 releases: any[]
 activeRelease: any

 setWorkflowStatus: (status: WorkflowStatus) => void
 setPublishStatus: (status: PublishStatus) => void
 setWorkflowReviewers: (reviewers: string[]) => void
 setScheduledAt: (date: string) => void
 setWorkflowComments: (comments: any[]) => void
 setReleases: (releases: any[]) => void
 setActiveRelease: (release: any) => void
}

export const useWorkflowStore = create<WorkflowState>((set) => ({
 workflowStatus: 'draft',
 publishStatus: 'draft',
 workflowReviewers: [],
 scheduledAt: '',
 workflowComments: [],
 releases: [],
 activeRelease: null,

 setWorkflowStatus: (workflowStatus) => set({ workflowStatus }),
 setPublishStatus: (publishStatus) => set({ publishStatus }),
 setWorkflowReviewers: (workflowReviewers) => set({ workflowReviewers }),
 setScheduledAt: (scheduledAt) => set({ scheduledAt }),
 setWorkflowComments: (workflowComments) => set({ workflowComments }),
 setReleases: (releases) => set({ releases }),
 setActiveRelease: (activeRelease) => set({ activeRelease }),
}))
