import React, { useRef, useState, useEffect } from 'react'
import { X, Save, RotateCcw, Globe } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTheme } from '../../../context/ThemeContext'
import { useEditorStore } from '../../../store/editorStore'
import { useModalStore } from '../../../store/modalStore'

const Twitter: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" />
  </svg>
)

const Facebook: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
  </svg>
)
import { humanize } from '../constants'
import { cn } from '../../../lib/utils'
import { useFocusTrap } from '../../../hooks/useFocusTrap'

interface SEOModalProps {
  onSave?: () => void | Promise<void>
}

const META_FIELDS = ['title', 'description', 'keywords'] as const

type MetaField = { title: string; description: string; keywords: string }

export const SEOModal: React.FC<SEOModalProps> = ({ onSave }) => {
  const { theme } = useTheme()
  const { data, updateData: editorUpdateData } = useEditorStore()
  const { seoOpen, setSeoOpen } = useModalStore()
  const activeSiteSlug = localStorage.getItem('activeSiteSlug')

  const [localMeta, setLocalMeta] = useState<MetaField>({
    title: '',
    description: '',
    keywords: '',
  })
  const [previewTab, setPreviewTab] = useState<'google' | 'twitter' | 'facebook'>('google')

  const siteUrl = activeSiteSlug === 'blog-demo'
    ? 'https://blog-demo.zenith.dev'
    : activeSiteSlug === 'storefront-glass'
    ? 'https://storefront.zenith.dev'
    : activeSiteSlug === 'demo'
    ? 'https://demo.zenith.dev'
    : 'https://zenith.dev'

  const pageUrl = data?.title
    ? `${siteUrl}/${data.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}`
    : `${siteUrl}/page`

  const seoTitle = localMeta.title || data?.title || 'Page Title'
  const seoDescription = localMeta.description || data?.heroDescription || 'Your page description goes here. This is what search engines will display in search results.'
  const seoKeywords = localMeta.keywords || ''
  const ogImage = (data?.meta as any)?.ogImage || ''

  const charCount = (s: string) => s.length
  const truncate = (s: string, len: number) => s.length > len ? s.slice(0, len) + '…' : s


  // Initialise local state when modal opens
  useEffect(() => {
    if (seoOpen) {
      setLocalMeta({
        title: (data?.meta?.title as string) || '',
        description: (data?.meta?.description as string) || '',
        keywords: (data?.meta?.keywords as string) || '',
      })
    }
  }, [seoOpen, data])

  const dialogRef = useRef<HTMLDivElement>(null)
  const modalTitleId = 'seo-modal-title'

  useFocusTrap(seoOpen, {
    onEscape: () => setSeoOpen(false),
    containerRef: dialogRef,
  })

  const handleFieldChange = (field: keyof MetaField, value: string) => {
    setLocalMeta((prev) => ({ ...prev, [field]: value }))
  }

  const commitAndClose = async () => {
    editorUpdateData((prev) => ({
      ...prev,
      meta: { ...(prev.meta || {}), ...localMeta },
    }))
    if (onSave) await onSave()
    setSeoOpen(false)
  }

  const resetToDefaults = () => {
    setLocalMeta({ title: '', description: '', keywords: '' })
  }

  return (
    <AnimatePresence>
      {seoOpen && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={modalTitleId}
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className={cn(
              'w-full max-w-lg border rounded-none overflow-hidden shadow-2xl flex flex-col max-h-[85vh]',
              theme === 'dark'
                ? 'bg-[#0a0a0a] border-white/10'
                : 'bg-white border-gray-200',
            )}
          >
            {/* Header */}
            <div
              className={cn(
                'p-6 border-b flex items-center justify-between',
                theme === 'dark' ? 'border-white/5' : 'border-gray-100',
              )}
            >
              <h3
                id={modalTitleId}
                className={cn(
                  'text-lg font-black uppercase italic leading-none',
                  theme === 'dark' ? 'text-white' : 'text-black',
                )}
              >
                SEO Meta
              </h3>
              <button
                onClick={() => setSeoOpen(false)}
                aria-label="Close"
                className="p-1 hover:text-indigo-500 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              {/* Preview Tab Bar */}
              <div className="flex items-center gap-1 p-1 border border-white/5 bg-white/[0.02] rounded-none shrink-0">
                {([
                  { id: 'google', icon: Globe, label: 'Google' },
                  { id: 'twitter', icon: Twitter, label: 'Twitter / X' },
                  { id: 'facebook', icon: Facebook, label: 'Facebook' },
                ] as const).map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setPreviewTab(tab.id)}
                    aria-label={`${tab.label} preview`}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 text-xs font-black uppercase italic tracking-wider transition-all border rounded-none flex-1 justify-center',
                      previewTab === tab.id
                        ? theme === 'dark'
                          ? 'bg-white/10 border-white/10 text-white'
                          : 'bg-white border-gray-200 text-black shadow-sm'
                        : theme === 'dark'
                          ? 'text-gray-500 border-transparent hover:text-gray-300'
                          : 'text-gray-400 border-transparent hover:text-gray-600'
                    )}
                  >
                    <tab.icon size={11} aria-hidden="true" />
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Preview iframe area */}
              <div
                className={cn(
                  'rounded-none border overflow-hidden transition-all min-h-[180px]',
                  theme === 'dark' ? 'bg-white/[0.02] border-white/5' : 'bg-gray-50 border-gray-200'
                )}
              >
                {/* ── Google SERP Preview ── */}
                <AnimatePresence mode="wait">
                  {previewTab === 'google' && (
                    <motion.div
                      key="google"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="p-5"
                    >
                      <div className="space-y-1">
                        <div className="text-xs text-gray-500 truncate">{pageUrl}</div>
                        <h2
                          className="text-lg font-normal text-[#1a0dab] leading-5 truncate cursor-pointer hover:underline"
                          style={{ fontFamily: 'Arial, sans-serif' }}
                        >
                          {seoTitle}
                        </h2>
                        <p
                          className="text-[13px] text-gray-700 leading-4"
                          style={{ fontFamily: 'Arial, sans-serif' }}
                        >
                          {truncate(seoDescription, 160)}
                        </p>
                        {seoKeywords && (
                          <div className="flex gap-1 flex-wrap mt-1.5">
                            {seoKeywords.split(',').slice(0, 4).map((kw, i) => (
                              <span
                                key={i}
                                className="text-xs px-1.5 py-0.5 border border-gray-300 rounded text-gray-500"
                              >
                                {kw.trim()}
                              </span>
                            ))}
                          </div>
                        )}
                                              </div>
                    </motion.div>
                  )}

                  {/* ── Twitter/X Card Preview ── */}
                  {previewTab === 'twitter' && (
                    <motion.div
                      key="twitter"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="p-5"
                    >
                      <div
                        className={cn(
                          'border rounded shadow-sm overflow-hidden max-w-[400px]',
                          theme === 'dark' ? 'bg-[#15202b] border-white/10' : 'bg-white border-gray-200'
                        )}
                      >
                        {/* Header */}
                        <div className="flex items-center gap-3 px-3 py-2">
                          <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white text-xs font-black shrink-0">
                            Z
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1">
                              <span className={cn('text-[11px] font-black', theme === 'dark' ? 'text-white' : 'text-black')}>
                                Zenith CMS
                              </span>
                              <span className={cn('text-xs', theme === 'dark' ? 'text-gray-500' : 'text-gray-400')}>@zenith·now</span>
                            </div>
                            <span className={cn('text-xs', theme === 'dark' ? 'text-gray-500' : 'text-gray-400')}>{pageUrl}</span>
                          </div>
                        </div>
                        {/* Card content */}
                        <div className={cn('px-3 pb-2 text-[12px] leading-4 font-normal', theme === 'dark' ? 'text-white' : 'text-black')}>
                          {seoTitle}
                        </div>
                        {/* Image */}
                        <div
                          className="w-full bg-cover bg-center border-t border-b"
                          style={{
                            backgroundImage: `url(${ogImage})`,
                            height: '157px',
                            borderColor: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                          }}
                        />
                        {/* Card footer */}
                                              </div>
                    </motion.div>
                  )}

                  {/* ── Facebook Card Preview ── */}
                  {previewTab === 'facebook' && (
                    <motion.div
                      key="facebook"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="p-5"
                    >
                      <div
                        className={cn(
                          'border rounded shadow-sm overflow-hidden max-w-[400px]',
                          theme === 'dark' ? 'bg-[#1c1e21] border-white/10' : 'bg-white border-gray-200'
                        )}
                      >
                        {/* Image */}
                        <div
                          className="w-full bg-cover bg-center"
                          style={{
                            backgroundImage: `url(${ogImage})`,
                            height: '180px',
                          }}
                        />
                        {/* Card body */}
                        <div
                          className={cn(
                            'p-3 border-t',
                            theme === 'dark' ? 'bg-[#242526] border-white/5' : 'bg-gray-50 border-gray-200'
                          )}
                        >
                          <div className="text-xs font-black uppercase tracking-wider text-gray-400 mb-1">
                            {siteUrl.replace(/^https?:\/\//, '')}
                          </div>
                          <div
                            className={cn(
                              'text-[13px] font-bold leading-4 line-clamp-2 mb-1',
                              theme === 'dark' ? 'text-white' : 'text-gray-900'
                            )}
                            style={{ fontFamily: 'Helvetica, Arial, sans-serif' }}
                          >
                            {seoTitle}
                          </div>
                          <div
                            className={cn(
                              'text-[11px] leading-3 line-clamp-2',
                              theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                            )}
                            style={{ fontFamily: 'Helvetica, Arial, sans-serif' }}
                          >
                            {truncate(seoDescription, 100)}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* SEO Fields */}
              {META_FIELDS.map((field) => (
                <div key={field} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor={`seo-${field}`}
                      className="text-xs font-black text-gray-500 uppercase tracking-widest italic px-1"
                    >
                      {humanize(field)}
                    </label>
                    {field === 'description' && (
                      <span className={cn(
                        'text-xs font-black italic',
                        charCount(localMeta.description) > 155
                          ? 'text-rose-500'
                          : 'text-gray-600'
                      )}>
                        {charCount(localMeta.description)} / 155
                      </span>
                    )}
                    {field === 'title' && (
                      <span className={cn(
                        'text-xs font-black italic',
                        charCount(localMeta.title) > 60
                          ? 'text-rose-500'
                          : 'text-gray-600'
                      )}>
                        {charCount(localMeta.title)} / 60
                      </span>
                    )}
                  </div>
                  {field === 'description' ? (
                    <textarea
                      id={`seo-${field}`}
                      value={localMeta[field]}
                      onChange={(e) =>
                        handleFieldChange(field, e.target.value)
                      }
                      className={cn(
                        'w-full rounded-none py-3 px-4 text-xs font-black italic h-24 resize-none transition-all border',
                        theme === 'dark'
                          ? 'bg-white/5 border-white/5 text-white focus-visible:border-indigo-500/30'
                          : 'bg-gray-50 border-gray-200 text-black focus-visible:border-indigo-600/30',
                      )}
                      placeholder="Enter page description..."
                    />
                  ) : (
                    <input
                      id={`seo-${field}`}
                      type="text"
                      value={localMeta[field]}
                      onChange={(e) =>
                        handleFieldChange(field, e.target.value)
                      }
                      className={cn(
                        'w-full rounded-none py-3 px-4 text-xs font-black italic transition-all border',
                        theme === 'dark'
                          ? 'bg-white/5 border-white/5 text-white focus-visible:border-indigo-500/30'
                          : 'bg-gray-50 border-gray-200 text-black focus-visible:border-indigo-600/30',
                      )}
                      placeholder={field === 'title' ? 'Enter SEO title...' : 'Enter keywords (comma separated)...'}
                    />
                  )}
                </div>
              ))}
            </div>

            {/* Footer */}
            <div
              className={cn(
                'p-4 border-t flex items-center justify-between shrink-0',
                theme === 'dark'
                  ? 'border-white/5 bg-white/[0.02]'
                  : 'border-gray-100 bg-gray-50',
              )}
            >
              <button
                onClick={resetToDefaults}
                aria-label="Reset SEO fields"
                className={cn(
                  'flex items-center gap-2 px-4 py-2 text-xs font-black uppercase italic rounded-none border transition-all',
                  theme === 'dark'
                    ? 'border-white/10 text-gray-400 hover:border-rose-500/20 hover:text-rose-400'
                    : 'border-gray-200 text-gray-500 hover:border-rose-200 hover:text-rose-500',
                )}
              >
                <RotateCcw size={12} />
                Reset
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSeoOpen(false)}
                  aria-label="Cancel and close"
                  className={cn(
                    'px-4 py-2 text-xs font-black uppercase italic rounded-none border transition-all',
                    theme === 'dark'
                      ? 'border-white/10 text-gray-400 hover:border-white/20 hover:text-white'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:text-black',
                  )}
                >
                  Cancel
                </button>
                <button
                  onClick={commitAndClose}
                  aria-label="Save SEO and close"
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-xs font-black uppercase italic rounded-none hover:bg-indigo-500 transition-all"
                >
                  <Save size={12} aria-hidden="true" />
                  Save & Close
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
