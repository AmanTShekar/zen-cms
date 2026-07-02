import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageSquare, Check, CheckCheck, Trash2, Send, X, ChevronDown, ChevronUp, CornerDownRight } from 'lucide-react'
import { useTheme } from '../../../context/ThemeContext'
import { useCommentsStore, type Comment } from '../../../store/commentsStore'
import { useAuthStore } from '../../../store/authStore'
import { cn } from '../../../lib/utils'
import { useShallow } from 'zustand/react/shallow'

interface CommentsPanelProps {
 collection: string
 documentId: string
 theme: 'light' | 'dark'
}

function timeAgo(dateStr: string): string {
 const now = Date.now()
 const then = new Date(dateStr).getTime()
 const diff = Math.floor((now - then) / 1000)
 if (diff < 60) return `${diff}s ago`
 if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
 if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
 return `${Math.floor(diff / 86400)}d ago`
}

const CommentItem: React.FC<{
 comment: Comment
 onResolve: (id: string, resolved: boolean) => void
 onReply: (id: string, content: string) => void
 onDelete: (id: string) => void
 posting: boolean
 theme: 'light' | 'dark'
 currentUserId?: string
}> = ({ comment, onResolve, onReply, onDelete, posting, theme, currentUserId }) => {
 const [replyOpen, setReplyOpen] = useState(false)
 const [replyContent, setReplyContent] = useState('')
 const [repliesOpen, setRepliesOpen] = useState(true)
 const isOwner = comment.authorId === currentUserId

 const handleReply = () => {
 if (!replyContent.trim()) return
 onReply(comment._id, replyContent)
 setReplyContent('')
 setReplyOpen(false)
 }

 return (
 <motion.div
 initial={{ opacity: 0, y: 4 }}
 animate={{ opacity: 1, y: 0 }}
 exit={{ opacity: 0, y: -2 }}
 className={cn(
 'border rounded-none-none overflow-hidden',
 comment.resolved
 ? theme === 'dark' ? 'border-z-border/10 bg-z-border/[0.03]' : 'border-z-border bg-[var(--z-bg-input)]/50'
 : theme === 'dark' ? 'border-z-border bg-z-panel' : 'border-z-border bg-z-panel'
 )}
 >
 {/* Thread header */}
 <div className="px-3 py-2.5 flex items-start gap-2.5">
 <div className={cn(
 'w-7 h-7 rounded-none-none flex items-center justify-center shrink-0 mt-0.5',
 theme === 'dark' ? 'bg-z-panel border border-z-border/20' : 'bg-[var(--z-bg-input)] border border-z-border'
 )}>
 <span className="text-xs font-semibold text-z-secondary">
 {comment.author?.[0] || '?'}
 </span>
 </div>
 <div className="flex-1 min-w-0">
 <div className="flex items-center gap-2 flex-wrap">
 <span className="text-xs font-semibold text-z-secondary">
 {comment.author}
 </span>
 <span className="text-sm text-z-secondary font-bold">
 {timeAgo(comment.createdAt)}
 </span>
 {comment.resolved && (
 <span className={cn(
 'text-sm font-semibold  px-1.5 py-0.5 rounded-none-none',
 theme === 'dark' ? 'bg-z-panel/5 text-z-secondary' : 'bg-[var(--z-bg-hover)] text-z-secondary'
 )}>
 Resolved
 </span>
 )}
 {comment.blockId && (
 <span className={cn(
 'text-sm font-mono px-1 py-0.5 rounded-none-none',
 theme === 'dark' ? 'bg-amber-500/10 text-amber-400' : 'bg-amber-50 text-amber-600'
 )}>
 Block: {comment.blockId}
 </span>
 )}
 </div>
 <p className={cn(
 'text-xs leading-relaxed font-medium mt-1',
 comment.resolved ? ' text-z-secondary' : 'text-z-secondary'
 )}>
 {comment.content}
 </p>
 </div>
 </div>

 {/* Replies */}
 {comment.replies?.length > 0 && (
 <div className={cn(
 'border-t',
 theme === 'dark' ? 'border-z-border' : 'border-z-border shadow-sm'
 )}>
 <button
 onClick={() => setRepliesOpen((v) => !v)}
 className={cn(
 'w-full flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold   transition-colors',
 theme === 'dark' ? 'text-z-secondary hover:text-z-secondary' : 'text-z-muted hover:text-z-secondary'
 )}
 >
 <CornerDownRight size={8} />
 {comment.replies.length} {comment.replies.length === 1 ? 'reply' : 'replies'}
 {repliesOpen ? <ChevronUp size={8} className="ml-auto" /> : <ChevronDown size={8} className="ml-auto" />}
 </button>

 <AnimatePresence initial={false}>
 {repliesOpen && (
 <motion.div
 initial={{ height: 0 }}
 animate={{ height: 'auto' }}
 exit={{ height: 0 }}
 transition={{ duration: 0.15 }}
 className="overflow-hidden"
 >
 <div className="px-3 pb-2 space-y-2">
 {comment.replies.map((reply, idx) => (
 <div key={idx} className={cn(
 'flex gap-2 pl-3 border-l-2',
 theme === 'dark' ? 'border-z-border/20' : 'border-z-border'
 )}>
 <div className="flex-1 min-w-0">
 <div className="flex items-center gap-1.5">
 <span className="text-xs font-semibold text-z-muted">{reply.author}</span>
 <span className="text-sm text-z-secondary">{timeAgo(reply.createdAt)}</span>
 </div>
 <p className="text-xs text-z-secondary font-medium">{reply.content}</p>
 </div>
 </div>
 ))}
 </div>
 </motion.div>
 )}
 </AnimatePresence>
 </div>
 )}

 {/* Actions */}
 <div className={cn(
 'px-3 py-1.5 border-t flex items-center gap-3',
 theme === 'dark' ? 'border-z-border' : 'border-z-border shadow-sm'
 )}>
 <button
 onClick={() => setReplyOpen((v) => !v)}
 className={cn(
 'flex items-center gap-1 text-xs font-semibold   transition-colors',
 theme === 'dark' ? 'text-z-secondary hover:text-z-secondary' : 'text-z-muted hover:text-z-secondary'
 )}
 >
 <CornerDownRight size={9} />
 Reply
 </button>

 <button
 onClick={() => onResolve(comment._id, !comment.resolved)}
 className={cn(
 'flex items-center gap-1 text-xs font-semibold   transition-colors',
 comment.resolved
 ? theme === 'dark' ? 'text-z-secondary hover:text-z-secondary' : 'text-z-secondary  hover:text-z-secondary'
 : theme === 'dark' ? 'text-z-muted/50 hover:text-z-secondary' : 'text-z-secondary hover:text-z-secondary '
 )}
 >
 {comment.resolved ? <CheckCheck size={9} /> : <Check size={9} />}
 {comment.resolved ? 'Reopen' : 'Resolve'}
 </button>

 {isOwner && (
 <button
 onClick={() => onDelete(comment._id)}
 className={cn(
 'flex items-center gap-1 text-xs font-semibold   transition-colors ml-auto',
 theme === 'dark' ? 'text-z-secondary hover:text-rose-400' : 'text-z-muted hover:text-rose-500'
 )}
 >
 <Trash2 size={9} />
 Delete
 </button>
 )}
 </div>

 {/* Reply box */}
 <AnimatePresence initial={false}>
 {replyOpen && (
 <motion.div
 initial={{ height: 0, opacity: 0 }}
 animate={{ height: 'auto', opacity: 1 }}
 exit={{ height: 0, opacity: 0 }}
 transition={{ duration: 0.15 }}
 className="overflow-hidden"
 >
 <div className={cn(
 'px-3 py-2 border-t flex gap-2',
 theme === 'dark' ? 'border-z-border' : 'border-z-border shadow-sm'
 )}>
 <input
 autoFocus
 type="text"
 value={replyContent}
 onChange={(e) => setReplyContent(e.target.value)}
 onKeyDown={(e) => e.key === 'Enter' && handleReply()}
 placeholder="Write a reply..."
 className={cn(
 'flex-1 px-2.5 py-1.5 text-xs rounded-none-none border transition-all',
 theme === 'dark'
 ? 'bg-z-hover border-z-border text-z-primary placeholder:text-z-muted focus:border-z-border/50'
 : 'bg-z-input border-z-border text-z-primary placeholder:text-z-muted focus:border-z-border-strong'
 )}
 />
 <button
 onClick={handleReply}
 disabled={posting || !replyContent.trim()}
 aria-label="Send reply"
 className={cn(
 'px-2.5 py-1.5 text-xs font-semibold   border transition-all rounded-none-none disabled:opacity-50',
 theme === 'dark'
 ? 'bg-z-hover border-z-border-strong border-z-border/20 text-z-secondary hover:bg-z-border/30'
 : 'bg-z-input border-z-border text-z-secondary hover:bg-[var(--z-bg-hover)]'
 )}
 >
 <Send size={10} aria-hidden="true" />
 </button>
 <button
 onClick={() => { setReplyOpen(false); setReplyContent('') }}
 aria-label="Cancel reply"
 className={cn(
 'px-2 py-1.5 text-xs font-semibold   border rounded-none-none',
 theme === 'dark' ? 'border-z-border text-z-secondary' : 'border-z-border text-z-muted'
 )}
 >
 <X size={10} aria-hidden="true" />
 </button>
 </div>
 </motion.div>
 )}
 </AnimatePresence>
 </motion.div>
 )
}

export const CommentsPanel: React.FC<CommentsPanelProps> = ({
 collection,
 documentId,
 theme,
}) => {
 const { comments, loading, posting, fetchComments, createComment, replyToComment, resolveComment, deleteComment  } = useCommentsStore(useShallow(state => ({ comments: state.comments, loading: state.loading, posting: state.posting, fetchComments: state.fetchComments, createComment: state.createComment, replyToComment: state.replyToComment, resolveComment: state.resolveComment, deleteComment: state.deleteComment })))
 const { user  } = useAuthStore(useShallow(state => ({ user: state.user })))
 const [newComment, setNewComment] = useState('')
 const [showResolved, setShowResolved] = useState(false)

 useEffect(() => {
 fetchComments(collection, documentId)
 }, [collection, documentId])

 const handleCreate = () => {
 if (!newComment.trim()) return
 createComment({ collection, documentId, content: newComment })
 setNewComment('')
 }

 const open = comments.length > 0 || !showResolved
 const filteredComments = showResolved ? comments : comments.filter((c) => !c.resolved)

 return (
 <div className="space-y-3">
 {/* Panel header */}
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2">
 <MessageSquare size={11} className="text-z-secondary" />
 <span className="text-xs font-semibold text-z-secondary">
 Review
 </span>
 <span className={cn(
 'px-1.5 py-0.5 text-sm font-semibold rounded-none-none',
 theme === 'dark' ? 'bg-z-hover text-z-secondary' : 'bg-[var(--z-bg-hover)] text-z-secondary'
 )}>
 {comments.filter((c) => !c.resolved).length} open / {comments.length} total
 </span>
 </div>
 <button
 onClick={() => setShowResolved((v) => !v)}
 className={cn(
 'text-xs font-semibold   transition-colors',
 theme === 'dark' ? 'text-z-secondary hover:text-z-secondary' : 'text-z-muted hover:text-z-secondary'
 )}
 >
 {showResolved ? 'Hide resolved' : 'Show resolved'}
 </button>
 </div>

 {/* New comment input */}
 <div className={cn(
 'border rounded-none-none p-2.5',
 theme === 'dark' ? 'border-z-border bg-z-panel' : 'border-z-border bg-[var(--z-bg-input)]/50'
 )}>
 <textarea
 value={newComment}
 onChange={(e) => setNewComment(e.target.value)}
 onKeyDown={(e) => {
 if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleCreate()
 }}
 placeholder="Add a comment... (Cmd+Enter to submit)"
 rows={2}
 className={cn(
 'w-full px-2 py-1.5 text-xs rounded-none-none border-none bg-transparent resize-none focus:outline-none focus-visible:ring-2 focus-visible:ring-z-active-border focus-visible:ring-offset-1 focus-visible:ring-offset-black focus:ring-0 placeholder:text-z-muted',
 theme === 'dark' ? 'text-z-secondary placeholder:text-z-muted' : 'text-z-primary placeholder:text-z-muted'
 )}
 />
 <div className="flex items-center justify-between mt-1.5">
 <span className="text-sm text-z-secondary font-bold">Cmd+Enter to submit</span>
 <button
 onClick={handleCreate}
 disabled={posting || !newComment.trim()}
 className={cn(
 'flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold   border rounded-none-none transition-all disabled:opacity-50',
 theme === 'dark'
 ? 'bg-z-hover border-z-border-strong border-z-border/30 text-z-secondary hover:bg-z-border/30 hover:border-z-border/50'
 : 'bg-z-input border-z-border text-z-secondary hover:bg-[var(--z-bg-hover)] hover:border-z-border-strong'
 )}
 >
 <MessageSquare size={9} />
 Comment
 </button>
 </div>
 </div>

 {/* Comments list */}
 {loading ? (
 <div className="text-center py-4">
 <div className={cn(
 'w-4 h-4 border-2 border-z-border border-t-transparent rounded-none-none animate-spin mx-auto mb-2'
 )} />
 <p className="text-xs text-z-secondary font-bold">Loading comments...</p>
 </div>
 ) : filteredComments.length === 0 ? (
 <div className={cn(
 'py-5 text-center border border-dashed rounded-none-none',
 'border-z-border'
 )}>
 <MessageSquare size={16} className="mx-auto text-z-secondary mb-1.5" />
 <p className="text-xs text-z-secondary font-bold">No comments yet</p>
 <p className="text-xs text-z-secondary mt-0.5">Be the first to leave a review note</p>
 </div>
 ) : (
 <div className="space-y-2">
 <AnimatePresence initial={false}>
 {filteredComments.map((comment) => (
 <CommentItem
 key={comment._id}
 comment={comment}
 onResolve={resolveComment}
 onReply={replyToComment}
 onDelete={deleteComment}
 posting={posting}
 theme={theme}
 currentUserId={user?.id}
 />
 ))}
 </AnimatePresence>
 </div>
 )}
 </div>
 )
}

export default CommentsPanel
