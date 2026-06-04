import { create } from 'zustand'
import api from '../lib/api'
import toast from 'react-hot-toast'

export interface Comment {
  _id: string
  collection: string
  documentId: string
  blockId?: string
  fieldKey?: string
  author: string
  authorEmail: string
  authorId?: string
  content: string
  resolved: boolean
  resolvedBy?: string
  resolvedAt?: string
  replies: Reply[]
  createdAt: string
  updatedAt: string
}

export interface Reply {
  author: string
  authorEmail: string
  authorId?: string
  content: string
  createdAt: string
  updatedAt: string
}

interface CommentsState {
  comments: Comment[]
  loading: boolean
  posting: boolean
  activeCommentId: string | null

  setActiveCommentId: (id: string | null) => void
  fetchComments: (collection: string, documentId: string) => Promise<void>
  createComment: (data: {
    collection: string
    documentId: string
    blockId?: string
    fieldKey?: string
    content: string
  }) => Promise<void>
  replyToComment: (commentId: string, content: string) => Promise<void>
  resolveComment: (commentId: string, resolved: boolean) => Promise<void>
  deleteComment: (commentId: string) => Promise<void>
}

export const useCommentsStore = create<CommentsState>((set, get) => ({
  comments: [],
  loading: false,
  posting: false,
  activeCommentId: null,

  setActiveCommentId: (activeCommentId) => set({ activeCommentId }),

  fetchComments: async (collection, documentId) => {
    set({ loading: true })
    try {
      const res = await api.get('/comments', { params: { collection, documentId } })
      set({ comments: res.data.data || [] })
    } catch {
      set({ comments: [] })
    } finally {
      set({ loading: false })
    }
  },

  createComment: async ({ collection, documentId, blockId, fieldKey, content }) => {
    set({ posting: true })
    try {
      const res = await api.post('/comments', { collection, documentId, blockId, fieldKey, content })
      set((state) => ({ comments: [res.data.data, ...state.comments] }))
    } finally {
      set({ posting: false })
    }
  },

  replyToComment: async (commentId, content) => {
    set({ posting: true })
    try {
      const res = await api.post(`/comments/${commentId}/reply`, { content })
      set((state) => ({
        comments: state.comments.map((c) =>
          c._id === commentId ? res.data.data : c
        ),
      }))
    } finally {
      set({ posting: false })
    }
  },

  resolveComment: async (commentId, resolved) => {
    try {
      const res = await api.patch(`/comments/${commentId}`, { resolved })
      set((state) => ({
        comments: state.comments.map((c) =>
          c._id === commentId ? res.data.data : c
        ),
      }))
    } catch { toast.error('Failed to update comment') }
  },

  deleteComment: async (commentId) => {
    try {
      await api.delete(`/comments/${commentId}`)
      set((state) => ({
        comments: state.comments.filter((c) => c._id !== commentId),
      }))
    } catch { toast.error('Failed to delete comment') }
  },
}))
