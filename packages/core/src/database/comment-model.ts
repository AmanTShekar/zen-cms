import mongoose, { Schema, Document } from 'mongoose'

export interface IComment {
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
  resolvedAt?: Date
  replies: ICommentReply[]
  siteId?: string
  createdAt: Date
  updatedAt: Date
}

export interface ICommentReply {
  author: string
  authorEmail: string
  authorId?: string
  content: string
  createdAt: Date
  updatedAt: Date
}

const CommentReplySchema = new Schema<Pick<IComment, 'replies'>>(
  {
    replies: [
      {
        author: { type: String, required: true },
        authorEmail: { type: String, required: true },
        authorId: { type: String },
        content: { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
        updatedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { _id: false }
)

const CommentSchema = new Schema<IComment>(
  {
    collection: { type: String, required: true, index: true },
    documentId: { type: String, required: true, index: true },
    blockId: { type: String, index: true },
    fieldKey: { type: String },
    author: { type: String, required: true },
    authorEmail: { type: String, required: true },
    authorId: { type: String },
    content: { type: String, required: true },
    resolved: { type: Boolean, default: false, index: true },
    resolvedBy: { type: String },
    resolvedAt: { type: Date },
    replies: [
      {
        author: { type: String, required: true },
        authorEmail: { type: String, required: true },
        authorId: { type: String },
        content: { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
        updatedAt: { type: Date, default: Date.now },
      },
    ],
    siteId: { type: String, required: true, index: true },
  },
  { strict: true, timestamps: true, suppressReservedKeysWarning: true }
)

// Compound index for fast queries
CommentSchema.index({ collection: 1, documentId: 1, resolved: 1, siteId: 1, createdAt: -1 })

export const Comment = mongoose.models.Comment || mongoose.model<IComment>('Comment', CommentSchema)
export default Comment