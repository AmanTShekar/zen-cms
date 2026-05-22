import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Calendar, Tag } from 'lucide-react'
import { Post, stripHtml, formatDate } from '../lib/cms'

interface ArticleCardProps {
  post: Post
  index?: number
  featured?: boolean
}

export default function ArticleCard({ post, index = 0, featured = false }: ArticleCardProps) {
  const [imageError, setImageError] = useState(false)

  const title = post.title || 'Untitled'
  const slug = post.slug || (post._id || post.id || '')
  const linkTo = `/post/${slug}`
  const excerpt =
    post.excerpt ||
    post.excerptPlain ||
    (post.content ? stripHtml(post.content).slice(0, 160) + '…' : '')
  const imageUrl =
    typeof post.coverImage === 'string'
      ? post.coverImage
      : post.coverImage?.url || `https://picsum.photos/seed/${slug}/800/450`
  const date = formatDate(post.publishedAt || post.createdAt)
  const tag = post.tags?.[0] || post.categories?.[0] || 'General'

  if (featured) {
    return (
      <motion.article
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: index * 0.08 }}
        className="group relative rounded-2xl overflow-hidden bg-glass-gradient border border-white/[0.06] shadow-glass hover:shadow-glass-hover transition-all duration-300"
      >
        <Link to={linkTo} className="block">
          {/* Cover */}
          <div className="relative h-72 overflow-hidden">
            {!imageError ? (
              <img
                src={imageUrl}
                alt={title}
                onError={() => setImageError(true)}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-indigo-900/50 to-purple-900/50 flex items-center justify-center">
                <span className="text-6xl opacity-20">📄</span>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-zenith-base via-zenith-base/20 to-transparent" />

            {/* Tag overlay */}
            <div className="absolute top-4 left-4">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zenith-accent/20 backdrop-blur-sm border border-zenith-accent/30 text-xs font-bold text-zenith-accentBright uppercase tracking-wider">
                <Tag size={10} />
                {tag}
              </span>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 pb-8 space-y-4">
            <h2 className="text-2xl font-black text-white leading-tight group-hover:text-zenith-accentBright transition-colors">
              {title}
            </h2>
            <p className="text-zenith-textMuted leading-relaxed line-clamp-2">{excerpt}</p>
            <div className="flex items-center justify-between pt-2">
              {date && (
                <div className="flex items-center gap-1.5 text-xs text-zenith-textDim font-mono">
                  <Calendar size={12} />
                  {date}
                </div>
              )}
              <div className="flex items-center gap-1.5 text-sm font-bold text-zenith-accentBright group-hover:gap-2.5 transition-all">
                Read Article <ArrowRight size={14} />
              </div>
            </div>
          </div>
        </Link>
      </motion.article>
    )
  }

  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.06 }}
      className="group"
    >
      <Link to={linkTo} className="block">
        <div className="rounded-xl overflow-hidden bg-glass-gradient border border-white/[0.05] shadow-glass hover:shadow-glass-hover hover:border-white/[0.1] transition-all duration-300">
          {/* Compact cover */}
          <div className="relative h-44 overflow-hidden">
            {!imageError ? (
              <img
                src={imageUrl}
                alt={title}
                onError={() => setImageError(true)}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-slate-800/60 to-slate-900/60 flex items-center justify-center">
                <span className="text-4xl opacity-20">📄</span>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-zenith-base via-transparent to-transparent" />

            {/* Tag */}
            <div className="absolute top-3 left-3">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/40 backdrop-blur-sm border border-white/10 text-[10px] font-bold text-white/80 uppercase tracking-wider">
                {tag}
              </span>
            </div>
          </div>

          {/* Content */}
          <div className="p-5 space-y-3">
            <h3 className="text-base font-bold text-white leading-snug group-hover:text-zenith-accentBright transition-colors line-clamp-2">
              {title}
            </h3>
            <p className="text-xs text-zenith-textMuted leading-relaxed line-clamp-2">{excerpt}</p>
            {date && (
              <div className="pt-2 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[11px] text-zenith-textDim font-mono">
                  <Calendar size={10} />
                  {date}
                </div>
                <div className="flex items-center gap-1 text-[11px] font-semibold text-zenith-textMuted group-hover:text-zenith-accentBright transition-colors">
                  Read <ArrowRight size={10} />
                </div>
              </div>
            )}
          </div>
        </div>
      </Link>
    </motion.article>
  )
}