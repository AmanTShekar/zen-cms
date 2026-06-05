import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageSquare, Check, CheckCheck, Trash2, Send, X, ChevronDown, ChevronUp, CornerDownRight } from 'lucide-react'
import { useTheme } from '../../../context/ThemeContext'
import { useCommentsStore, type Comment } from '../../../store/commentsStore'
import { useAuthStore } from '../../../store/authStore'
import { cn } from '../../../lib/utils'

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
 'border rounded-none overflow-hidden',
 comment.resolved
 ? theme === 'dark' ? 'border-emerald-500/10 bg-emerald-500/[0.03]' : 'border-emerald-200 bg-emerald-50/50'
 : theme === 'dark' ? 'border-white/[0.08] bg-white/[0.02]' : 'border-gray-200 bg-white'
 )}
 >
 {/* Thread header */}
 <div className="px-3 py-2.5 flex items-start gap-2.5">
 <div className={cn(
 'w-7 h-7 rounded-none flex items-center justify-center shrink-0 mt-0.5',
 theme === 'dark' ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-emerald-50 border border-emerald-100'
 )}>
 <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 uppercase">
 {comment.author?.[0] || '?'}
 </span>
 </div>
 <div className="flex-1 min-w-0">
 <div className="flex items-center gap-2 flex-wrap">
 <span className="text-xs font-black text-gray-300 uppercase ">
 {comment.author}
 </span>
 <span className="text-[7px] text-gray-600 font-bold uppercase tracking-widest">
 {timeAgo(comment.createdAt)}
 </span>
 {comment.resolved && (
 <span className={cn(
 'text-[7px] font-black uppercase px-1.5 py-0.5 rounded-none',
 theme === 'dark' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-emerald-100 text-emerald-600'
 )}>
 Resolved
 </span>
 )}
 {comment.blockId && (
 <span className={cn(
 'text-[7px] font-mono px-1 py-0.5 rounded-none',
 theme === 'dark' ? 'bg-amber-500/10 text-amber-400' : 'bg-amber-50 text-amber-600'
 )}>
 Block: {comment.blockId}
 </span>
 )}
 </div>
 <p className={cn(
 'text-xs leading-relaxed font-medium mt-1',
 comment.resolved ? ' text-gray-500' : theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
 )}>
 {comment.content}
 </p>
 </div>
 </div>

 {/* Replies */}
 {comment.replies?.length > 0 && (
 <div className={cn(
 'border-t',
 theme === 'dark' ? 'border-white/[0.08]' : 'border-gray-200 shadow-sm'
 )}>
 <button
 onClick={() => setRepliesOpen((v) => !v)}
 className={cn(
 'w-full flex items-center gap-1.5 px-3 py-1.5 text-xs font-black uppercase tracking-widest transition-colors',
 theme === 'dark' ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'
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
 theme === 'dark' ? 'border-emerald-500/20' : 'border-emerald-100'
 )}>
 <div className="flex-1 min-w-0">
 <div className="flex items-center gap-1.5">
 <span className="text-xs font-black text-gray-400">{reply.author}</span>
 <span className="text-[7px] text-gray-600">{timeAgo(reply.createdAt)}</span>
 </div>
 <p className="text-xs text-gray-500 font-medium">{reply.content}</p>
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
 theme === 'dark' ? 'border-white/[0.08]' : 'border-gray-200 shadow-sm'
 )}>
 <button
 onClick={() => setReplyOpen((v) => !v)}
 className={cn(
 'flex items-center gap-1 text-xs font-black uppercase tracking-wider transition-colors',
 theme === 'dark' ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'
 )}
 >
 <CornerDownRight size={9} />
 Reply
 </button>

 <button
 onClick={() => onResolve(comment._id, !comment.resolved)}
 className={cn(
 'flex items-center gap-1 text-xs font-black uppercase tracking-wider transition-colors',
 comment.resolved
 ? theme === 'dark' ? 'text-emerald-600 dark:text-emerald-400 hover:text-emerald-300' : 'text-emerald-600 dark:text-emerald-500 hover:text-emerald-600'
 : theme === 'dark' ? 'text-emerald-400/50 hover:text-emerald-300' : 'text-emerald-300 hover:text-emerald-600 dark:text-emerald-500'
 )}
 >
 {comment.resolved ? <CheckCheck size={9} /> : <Check size={9} />}
 {comment.resolved ? 'Reopen' : 'Resolve'}
 </button>

 {isOwner && (
 <button
 onClick={() => onDelete(comment._id)}
 className={cn(
 'flex items-center gap-1 text-xs font-black uppercase tracking-wider transition-colors ml-auto',
 theme === 'dark' ? 'text-gray-600 hover:text-rose-400' : 'text-gray-400 hover:text-rose-500'
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
 theme === 'dark' ? 'border-white/[0.08]' : 'border-gray-200 shadow-sm'
 )}>
 <input
 autoFocus
 type="text"
 value={replyContent}
 onChange={(e) => setReplyContent(e.target.value)}
 onKeyDown={(e) => e.key === 'Enter' && handleReply()}
 placeholder="Write a reply..."
 className={cn(
 'flex-1 px-2.5 py-1.5 text-xs rounded-none border transition-all',
 theme === 'dark'
 ? 'bg-white/5 border-white/8 text-white placeholder-gray-600 focus:border-emerald-500/50'
 : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 focus:border-emerald-300'
 )}
 />
 <button
 onClick={handleReply}
 disabled={posting || !replyContent.trim()}
 aria-label="Send reply"
 className={cn(
 'px-2.5 py-1.5 text-xs font-black uppercase tracking-wider border transition-all rounded-none disabled:opacity-50',
 theme === 'dark'
 ? 'bg-emerald-500/20 border-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30'
 : 'bg-emerald-50 border-emerald-200 text-emerald-600 hover:bg-emerald-100'
 )}
 >
 <Send size={10} aria-hidden="true" />
 </button>
 <button
 onClick={() => { setReplyOpen(false); setReplyContent('') }}
 aria-label="Cancel reply"
 className={cn(
 'px-2 py-1.5 text-xs font-black uppercase tracking-wider border rounded-none',
 theme === 'dark' ? 'border-white/[0.08] text-gray-600' : 'border-gray-200 text-gray-400'
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
 const { comments, loading, posting, fetchComments, createComment, replyToComment, resolveComment, deleteComment } = useCommentsStore()
 const { user } = useAuthStore()
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
 <MessageSquare size={11} className="text-emerald-600 dark:text-emerald-400" />
 <span className="text-xs font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
 Review
 </span>
 <span className={cn(
 'px-1.5 py-0.5 text-[7px] font-black rounded-none',
 theme === 'dark' ? 'bg-white/5 text-gray-500' : 'bg-gray-100 text-gray-500'
 )}>
 {comments.filter((c) => !c.resolved).length} open / {comments.length} total
 </span>
 </div>
 <button
 onClick={() => setShowResolved((v) => !v)}
 className={cn(
 'text-xs font-black uppercase tracking-wider transition-colors',
 theme === 'dark' ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'
 )}
 >
 {showResolved ? 'Hide resolved' : 'Show resolved'}
 </button>
 </div>

 {/* New comment input */}
 <div className={cn(
 'border rounded-none p-2.5',
 theme === 'dark' ? 'border-white/[0.08] bg-white/[0.01]' : 'border-gray-200 bg-gray-50/50'
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
 'w-full px-2 py-1.5 text-xs rounded-none border-none bg-transparent resize-none focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-black focus:ring-0 placeholder-gray-500',
 theme === 'dark' ? 'text-gray-300 placeholder-gray-600' : 'text-gray-700 placeholder-gray-400'
 )}
 />
 <div className="flex items-center justify-between mt-1.5">
 <span className="text-[7px] text-gray-600 font-bold">Cmd+Enter to submit</span>
 <button
 onClick={handleCreate}
 disabled={posting || !newComment.trim()}
 className={cn(
 'flex items-center gap-1.5 px-3 py-1.5 text-xs font-black uppercase tracking-wider border rounded-none transition-all disabled:opacity-50',
 theme === 'dark'
 ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/30 hover:border-emerald-500/50'
 : 'bg-emerald-50 border-emerald-200 text-emerald-600 hover:bg-emerald-100 hover:border-emerald-300'
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
 'w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-none animate-spin mx-auto mb-2'
 )} />
 <p className="text-xs text-gray-500 font-bold">Loading comments...</p>
 </div>
 ) : filteredComments.length === 0 ? (
 <div className={cn(
 'py-5 text-center border border-dashed rounded-none',
 theme === 'dark' ? 'border-white/[0.08]' : 'border-gray-200'
 )}>
 <MessageSquare size={16} className="mx-auto text-gray-600 mb-1.5" />
 <p className="text-xs text-gray-500 font-bold ">No comments yet</p>
 <p className="text-xs text-gray-600 mt-0.5">Be the first to leave a review note</p>
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
