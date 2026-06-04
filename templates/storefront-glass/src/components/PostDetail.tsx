import React from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Calendar, User, Tag } from 'lucide-react'
import { Post, formatDate, parseLexicalToHTML } from '../lib/cms'

interface PostDetailProps {
  post: Post
}

export default function PostDetail({ post }: PostDetailProps) {
  const [imageError, setImageError] = React.useState(false)
  const [readingProgress, setReadingProgress] = React.useState(0)

  const title = post.title || 'Untitled'
  let content = post.content || ''
  
  if (typeof content === 'object' || (typeof content === 'string' && content.startsWith('{'))) {
    content = parseLexicalToHTML(content)
  }

  const imageUrl =
    typeof post.coverImage === 'string'
      ? post.coverImage
      : post.coverImage?.url || `https://picsum.photos/seed/${post.slug || post._id || post.id}/1200/630`
  const date = formatDate(post.publishedAt || post.createdAt)
  const tags = post.tags || post.categories || []

  React.useEffect(() => {
    const onScroll = () => {
      const el = document.documentElement
      const scrollTop = el.scrollTop || document.body.scrollTop
      const scrollHeight = el.scrollHeight - el.clientHeight
      const progress = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0
      setReadingProgress(Math.min(100, progress))
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <>
      {/* Reading Progress Bar */}
      <motion.div
        className="fixed top-0 left-0 h-0.5 bg-gradient-to-r from-indigo-500 to-purple-500 z-[100]"
        style={{ width: `${readingProgress}%` }}
        transition={{ duration: 0.05 }}
      />

      <article id={post._id || post.id} className="max-w-3xl mx-auto">
        {/* Back link */}
        <motion.div
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-8"
        >
          <Link
            to="/posts"
            className="inline-flex items-center gap-2 text-sm text-zenith-textMuted hover:text-white transition-colors group"
          >
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
            Back to Posts
          </Link>
        </motion.div>

        {/* Meta */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-wrap items-center gap-3 mb-6"
        >
          {tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-xs font-bold text-indigo-300 uppercase tracking-wider"
            >
              <Tag size={10} />
              {tag}
            </span>
          ))}
        </motion.div>

        {/* Title */}
        <motion.h1
          id="title"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-3xl sm:text-5xl font-black text-white leading-[1.1] tracking-tight mb-8"
        >
          {title}
        </motion.h1>

        {/* Cover */}
        <motion.div
          id="coverImage"
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="mb-10"
        >
          <div className="relative rounded-2xl overflow-hidden shadow-glass">
            {!imageError ? (
              <img
                src={imageUrl}
                alt={title}
                onError={() => setImageError(true)}
                className="w-full aspect-[1.91/1] object-cover"
              />
            ) : (
              <div className="w-full aspect-[1.91/1] bg-gradient-to-br from-indigo-900/40 to-purple-900/40 flex items-center justify-center">
                <span className="text-8xl opacity-10">📄</span>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-zenith-base/40 to-transparent" />
          </div>
        </motion.div>

        {/* Byline */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="flex flex-wrap items-center gap-4 pb-8 mb-10 border-b border-white/[0.06]"
        >
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center overflow-hidden">
              {post.author?.avatar ? (
                <img 
                  src={typeof post.author.avatar === 'string' ? post.author.avatar : post.author.avatar.url?.startsWith('http') ? post.author.avatar.url : `http://localhost:3000${post.author.avatar.url}`} 
                  alt={post.author?.name || 'Author'} 
                  className="w-full h-full object-cover" 
                />
              ) : (
                <User size={16} className="text-white" />
              )}
            </div>
            <span className="text-sm font-semibold text-white">
              {post.author?.name || 'Zenith Author'}
            </span>
          </div>
          {date && (
            <div className="flex items-center gap-1.5 text-sm text-zenith-textMuted font-mono">
              <Calendar size={14} />
              {date}
            </div>
          )}
        </motion.div>

        {/* Content */}
        <motion.div
          id="content"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.25 }}
          className="prose-zenith"
        >
          <div
            className="text-base sm:text-lg leading-[1.85] text-zenith-textMuted [&_p]:mb-6 [&_h2]:text-white [&_h2]:font-black [&_h2]:text-2xl [&_h2]:mt-12 [&_h2]:mb-4 [&_h3]:text-white [&_h3]:font-bold [&_h3]:text-xl [&_h3]:mt-8 [&_h3]:mb-3 [&_a]:text-indigo-400 [&_a]:hover:text-indigo-300 [&_blockquote]:border-l-2 [&_blockquote]:border-indigo-500/50 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-zenith-textMuted [&_code]:font-mono [&_code]:bg-white/[0.05] [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_pre]:bg-white/[0.03] [&_pre]:border [&_pre]:border-white/[0.06] [&_pre]:rounded-xl [&_pre]:p-6 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-6 [&_li]:mb-2"
            dangerouslySetInnerHTML={{ __html: content }}
          />
        </motion.div>

        {/* Bottom tag list */}
        {tags.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="mt-12 flex flex-wrap gap-2 pt-8 border-t border-white/[0.06]"
          >
            {tags.map((tag) => (
              <span
                key={tag}
                className="px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.06] text-xs font-medium text-zenith-textMuted"
              >
                #{tag}
              </span>
            ))}
          </motion.div>
        )}
      </article>
    </>
  )
}