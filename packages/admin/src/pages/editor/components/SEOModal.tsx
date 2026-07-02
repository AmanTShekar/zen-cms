import React, { useRef, useState, useEffect } from 'react'
import { X, Save, RotateCcw, Globe, Wand2, Loader2 } from 'lucide-react'
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
import { cn, extractTextFromBlocks } from '../../../lib/utils'
import { useFocusTrap } from '../../../hooks/useFocusTrap'
import { useShallow } from 'zustand/react/shallow'
import api from '../../../lib/api'
import { toast } from 'react-hot-toast'

interface SEOModalProps {
 onSave?: () => void | Promise<void>
}

const META_FIELDS = ['title', 'description', 'keywords'] as const

type MetaField = { title: string; description: string; keywords: string }

export const SEOModal: React.FC<SEOModalProps> = ({ onSave }) => {
 const { theme } = useTheme()
 const { data, updateData: editorUpdateData } = useEditorStore()
 const { seoOpen, setSeoOpen  } = useModalStore(useShallow(state => ({ seoOpen: state.seoOpen, setSeoOpen: state.setSeoOpen })))
 const activeSiteSlug = localStorage.getItem('activeSiteSlug')

 const [localMeta, setLocalMeta] = useState<MetaField>({
 title: '',
 description: '',
 keywords: '',
 })
 const [previewTab, setPreviewTab] = useState<'google' | 'twitter' | 'facebook'>('google')
 const [isGenerating, setIsGenerating] = useState<Record<string, boolean>>({})

 const generateAIContent = async (field: keyof MetaField) => {
 setIsGenerating(prev => ({ ...prev, [field]: true }))
 try {
 const contentText = extractTextFromBlocks(data?.sections)
 if (!contentText) throw new Error('No content available to analyze')

 let response: any;
 if (field === 'description') {
 response = await api.post('/content-tools/ai/meta-description', {
 title: localMeta.title || data?.title || 'Untitled',
 content: contentText
 })
 if (response.data?.data?.description) {
 handleFieldChange(field, response.data.data.description)
 toast.success('Generated description')
 }
 } else if (field === 'title') {
 response = await api.post('/content-tools/ai/generate', {
 prompt: `Write a highly optimized, compelling SEO title (max 60 chars) for this page. The page content is: ${contentText}. Follow SEO best practices: include the primary keyword near the beginning if possible, keep it engaging but accurate, and avoid clickbait.`
 })
 if (response.data?.data?.text) {
 handleFieldChange(field, response.data.data.text.replace(/["']/g, '').trim())
 toast.success('Generated title')
 }
 } else if (field === 'keywords') {
 response = await api.post('/content-tools/ai/generate', {
 prompt: `Extract exactly 5 highly relevant SEO keywords as a simple comma-separated list from this content: ${contentText}. Ensure these are context-based, specific, and reflect the true topic of the page.`
 })
 if (response.data?.data?.text) {
 handleFieldChange(field, response.data.data.text.trim())
 toast.success('Generated keywords')
 }
 }
 } catch (e: any) {
 toast.error(e?.response?.data?.error?.message || 'Failed to generate content')
 } finally {
 setIsGenerating(prev => ({ ...prev, [field]: false }))
 }
 }

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
 <div className="fixed inset-0 z-[600] flex items-center justify-center p-6 bg-[var(--z-bg-modal)] backdrop-blur-sm">
 <motion.div
 ref={dialogRef}
 role="dialog"
 aria-modal="true"
 aria-labelledby={modalTitleId}
 initial={{ scale: 0.95, opacity: 0 }}
 animate={{ scale: 1, opacity: 1 }}
 exit={{ scale: 0.95, opacity: 0 }}
 className={cn(
 'w-full max-w-lg border rounded-none-none overflow-hidden shadow-2xl flex flex-col max-h-[85vh]',
 theme === 'dark'
 ? 'bg-[#0a0a0a] border-z-border'
 : 'bg-z-panel border-z-border',
 )}
 >
 {/* Header */}
 <div
 className={cn(
 'p-6 border-b flex items-center justify-between',
 theme === 'dark' ? 'border-z-border' : 'border-z-border shadow-sm',
 )}
 >
 <h3
 id={modalTitleId}
 className={cn(
 'text-lg font-semibold  leading-none',
 theme === 'dark' ? 'text-z-primary' : 'text-z-primary',
 )}
 >
 SEO Meta
 </h3>
 <button
 type="button"
 onClick={() => setSeoOpen(false)}
 aria-label="Close"
 className="p-1 hover:text-z-secondary  transition-colors"
 >
 <X size={18} />
 </button>
 </div>

 {/* Body */}
 <div className="p-6 space-y-4 overflow-y-auto flex-1">
 {/* Preview Tab Bar */}
 <div className="flex items-center gap-1 p-1 border border-z-border bg-z-panel rounded-none-none shrink-0">
 {([
 { id: 'google', icon: Globe, label: 'Google' },
 { id: 'twitter', icon: Twitter, label: 'Twitter / X' },
 { id: 'facebook', icon: Facebook, label: 'Facebook' },
 ] as const).map((tab) => (
 <button
 key={tab.id}
 type="button"
 onClick={() => setPreviewTab(tab.id)}
 aria-label={`${tab.label} preview`}
 className={cn(
 'flex items-center gap-2 px-3 py-2 text-xs font-semibold   transition-all border rounded-none-none flex-1 justify-center',
 previewTab === tab.id
 ? theme === 'dark'
 ? 'bg-z-panel/10 border-z-border text-z-primary'
 : 'bg-z-panel border-z-border text-z-primary shadow-sm'
 : theme === 'dark'
 ? 'text-z-secondary border-transparent hover:text-z-secondary'
 : 'text-z-muted border-transparent hover:text-z-secondary'
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
 'rounded-none-none border overflow-hidden transition-all min-h-[180px]',
 theme === 'dark' ? 'bg-z-panel/5 border-z-border' : 'bg-z-input border-z-border'
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
 <div className="text-xs text-z-secondary truncate">{pageUrl}</div>
 <h2
 className="text-lg font-normal text-[#1a0dab] leading-5 truncate cursor-pointer hover:underline"
 style={{ fontFamily: 'Arial, sans-serif' }}
 >
 {seoTitle}
 </h2>
 <p
 className="text-[13px] text-z-primary leading-4"
 style={{ fontFamily: 'Arial, sans-serif' }}
 >
 {truncate(seoDescription, 160)}
 </p>
 {seoKeywords && (
 <div className="flex gap-1 flex-wrap mt-1.5">
 {seoKeywords.split(',').slice(0, 4).map((kw, i) => (
 <span
 key={i}
 className="text-xs px-1.5 py-0.5 border border-z-border-strong rounded-none text-z-secondary"
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
 'border rounded-none shadow-sm overflow-hidden max-w-[400px]',
 theme === 'dark' ? 'bg-[#15202b] border-z-border' : 'bg-z-panel border-z-border'
 )}
 >
 {/* Header */}
 <div className="flex items-center gap-3 px-3 py-2">
 <div className="w-8 h-8 rounded-none-none bg-z-border flex items-center justify-center text-z-primary text-xs font-semibold shrink-0">
 Z
 </div>
 <div className="min-w-0">
 <div className="flex items-center gap-1">
 <span className={cn('text-sm font-semibold', theme === 'dark' ? 'text-z-primary' : 'text-z-primary')}>
 Zenith CMS
 </span>
 <span className={cn('text-xs', 'text-z-secondary')}>@zenith·now</span>
 </div>
 <span className={cn('text-xs', 'text-z-secondary')}>{pageUrl}</span>
 </div>
 </div>
 {/* Card content */}
 <div className={cn('px-3 pb-2 text-sm leading-4 font-normal', theme === 'dark' ? 'text-z-primary' : 'text-z-primary')}>
 {seoTitle}
 </div>
 {/* Image */}
 <div
 className="w-full bg-cover bg-center border-t border-b"
 style={{
 backgroundImage: `url(${ogImage})`,
 height: '157px',
 borderColor: 'var(--z-border)',
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
 'border rounded-none shadow-sm overflow-hidden max-w-[400px]',
 theme === 'dark' ? 'bg-[#1c1e21] border-z-border' : 'bg-z-panel border-z-border'
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
 theme === 'dark' ? 'bg-[#242526] border-z-border' : 'bg-z-input border-z-border'
 )}
 >
 <div className="text-xs font-semibold text-z-muted mb-1">
 {siteUrl.replace(/^https?:\/\//, '')}
 </div>
 <div
 className={cn(
 'text-[13px] font-bold leading-4 line-clamp-2 mb-1',
 'text-z-primary'
 )}
 style={{ fontFamily: 'Helvetica, Arial, sans-serif' }}
 >
 {seoTitle}
 </div>
 <div
 className={cn(
 'text-sm leading-3 line-clamp-2',
 theme === 'dark' ? 'text-z-muted' : 'text-z-secondary'
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
 <div className="flex items-center gap-2">
 <label
 htmlFor={`seo-${field}`}
 className="text-xs font-semibold text-z-secondary px-1"
 >
 {humanize(field)}
 </label>
 <button
 type="button"
 onClick={() => generateAIContent(field)}
 disabled={isGenerating[field]}
 title={`Auto-generate ${field} with AI`}
 className="text-z-muted hover:text-indigo-500 transition-colors disabled:opacity-50"
 >
 {isGenerating[field] ? <Loader2 size={12} className="animate-spin" /> : <Wand2 size={12} />}
 </button>
 </div>
 {field === 'description' && (
 <span className={cn(
 'text-xs font-semibold ',
 charCount(localMeta.description) > 155
 ? 'text-rose-500'
 : 'text-z-secondary'
 )}>
 {charCount(localMeta.description)} / 155
 </span>
 )}
 {field === 'title' && (
 <span className={cn(
 'text-xs font-semibold ',
 charCount(localMeta.title) > 60
 ? 'text-rose-500'
 : 'text-z-secondary'
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
 'w-full rounded-none-none py-3 px-4 text-xs font-semibold h-24 resize-none transition-all border',
 theme === 'dark'
 ? 'bg-z-hover border-z-border text-z-primary focus-visible:border-z-border/30'
 : 'bg-z-input border-z-border text-z-primary focus-visible:border-z-border/30',
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
 'w-full rounded-none-none py-3 px-4 text-xs font-semibold transition-all border',
 theme === 'dark'
 ? 'bg-z-hover border-z-border text-z-primary focus-visible:border-z-border/30'
 : 'bg-z-input border-z-border text-z-primary focus-visible:border-z-border/30',
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
 ? 'border-z-border bg-z-panel'
 : 'border-z-border shadow-sm bg-[var(--z-bg-input)]',
 )}
 >
 <button
 type="button"
 onClick={resetToDefaults}
 aria-label="Reset SEO fields"
 className={cn(
 'flex items-center gap-2 px-4 py-2 text-xs font-semibold  rounded-none-none border transition-all',
 theme === 'dark'
 ? 'border-z-border text-z-muted hover:border-rose-500/20 hover:text-rose-400'
 : 'border-z-border text-z-secondary hover:border-rose-200 hover:text-rose-500',
 )}
 >
 <RotateCcw size={12} />
 Reset
 </button>
 <div className="flex items-center gap-2">
 <button
 type="button"
 onClick={() => setSeoOpen(false)}
 aria-label="Cancel and close"
 className={cn(
 'px-4 py-2 text-xs font-semibold  rounded-none-none border transition-all',
 theme === 'dark'
 ? 'border-z-border text-z-muted hover:border-z-border hover:text-z-primary'
 : 'border-z-border text-z-secondary hover:border-z-border-strong hover:text-z-primary',
 )}
 >
 Cancel
 </button>
 <button
 type="button"
 onClick={commitAndClose}
 aria-label="Save SEO and close"
 className="flex items-center gap-2 px-4 py-2 bg-z-accent  text-z-primary text-xs font-semibold rounded-none-none hover:bg-z-border transition-all"
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
