import React from 'react'
import { useParams } from 'react-router-dom'
import { X, Eye, History, MessageSquare, Monitor, Tablet, Smartphone } from 'lucide-react'
import { useTheme } from '../../../context/ThemeContext'
import { useEditorStore } from '../../../store/editorStore'
import { usePanelStore } from '../../../store/panelStore'
import { useTenantStorage } from '../../../hooks/useTenantStorage'
import { cn } from '../../../lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import api from '../../../lib/api'
import { CommentsPanel } from './CommentsPanel'
import toast from 'react-hot-toast'

interface RightPanelProps {
  isGlobal?: boolean
  resizingSide: 'left' | 'right' | null
  startResizing: (side: 'left' | 'right') => (e: React.MouseEvent) => void
  iframeRef: React.RefObject<HTMLIFrameElement | null>
  handleRestore: (versionId: string) => Promise<void>
  onCompareDiff: (versionId: string, versionNumber: number) => void
}

const storefrontUrl = import.meta.env.VITE_STOREFRONT_URL as string | undefined

type ViewportSize = 'desktop' | 'tablet' | 'mobile'

const VIEWPORT_SIZES: Record<ViewportSize, { width: number; height: number; icon: typeof Monitor }> = {
  desktop: { width: 1440, height: 900, icon: Monitor },
  tablet: { width: 768, height: 1024, icon: Tablet },
  mobile: { width: 375, height: 812, icon: Smartphone },
}

export const RightPanel: React.FC<RightPanelProps> = ({
  isGlobal = false,
  resizingSide,
  startResizing,
  iframeRef,
  handleRestore,
  onCompareDiff,
}) => {
  const { id, slug } = useParams<{ id: string; slug: string }>()
  const documentId = id || slug
  const { theme } = useTheme()
  const { history, data } = useEditorStore()
  const { rightOpen, rightWidth, activeRightTab, setActiveRightTab, setRightOpen, previewMode, setPreviewMode } = usePanelStore()
  const { siteId: tenantSiteId, siteSlug, siteDomain } = useTenantStorage()

  const [sites, setSites] = React.useState<any[]>([])
  const [previewToken, setPreviewToken] = React.useState<string | null>(null)
  const collectionSlug = isGlobal ? 'globals' : (slug || 'pages')

  React.useEffect(() => {
    api.get('/sites')
      .then((res) => {
        setSites(res.data?.data || [])
      })
      .catch(() => { toast.error('Failed to load sites') })
  }, [])

  React.useEffect(() => {
    const fetchToken = async () => {
      if (!documentId || documentId === 'new') return
      if (collectionSlug === 'globals') return // Globals do not support preview tokens yet
      try {
        const res = await api.post(`/${collectionSlug}/${documentId}/preview-token`)
        setPreviewToken(res.data.data?.token || null)
      } catch { /* ignore */ }
    }
    fetchToken()
  }, [collectionSlug, documentId])

  const pageSiteId = data?.siteId || tenantSiteId || ''
  const matchingSite = sites.find((s) => (s._id || s.id) === pageSiteId)

  // Resolve dynamic storefront URL based on Zustand/localStorage configurations or fallback port mappings
  let resolvedStorefrontUrl = storefrontUrl || ''
  if (!resolvedStorefrontUrl) {
    const slugToUse = matchingSite ? matchingSite.slug : siteSlug
    const domainToUse = matchingSite ? matchingSite.domain : siteDomain

    if (slugToUse === 'storefront-glass') {
      resolvedStorefrontUrl = 'http://localhost:5178'
    } else if (slugToUse === 'demo') {
      resolvedStorefrontUrl = 'http://localhost:5174'
    } else if (slugToUse === 'blog-demo') {
      resolvedStorefrontUrl = 'http://localhost:5176'
    } else if (slugToUse === 'storefront-editorial') {
      resolvedStorefrontUrl = 'http://localhost:5177'
    } else if (domainToUse) {
      resolvedStorefrontUrl = domainToUse.startsWith('http')
        ? domainToUse
        : `http://${domainToUse}`
    } else {
      resolvedStorefrontUrl = '' // No valid storefront configuration found
    }
  }

  const TABS = [
    { id: 'preview', icon: Eye, label: 'Live' },
    { id: 'history', icon: History, label: 'Versions' },
    { id: 'comments', icon: MessageSquare, label: 'Review' },
  ] as const

  const viewport = VIEWPORT_SIZES[previewMode as ViewportSize] || VIEWPORT_SIZES.desktop
  const isDesktop = previewMode === 'desktop'
  const dark = theme === 'dark'

  return (
    <AnimatePresence initial={false}>
      {rightOpen && (
        <motion.aside
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: rightWidth, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          className={cn(
            'border-l flex flex-col z-50 overflow-hidden shrink-0',
            'md:relative fixed inset-y-0 right-0 max-md:!w-[280px] max-md:z-[100] max-md:shadow-2xl',
            dark
              ? 'bg-[#080808] border-white/5'
              : 'bg-white border-gray-200 shadow-xl'
          )}
        >
          {/* Mobile backdrop */}
          <div
            onClick={() => setRightOpen(false)}
            className="md:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-[99]"
          />
          {/* Resize handle */}
          <div
            onMouseDown={startResizing('right')}
            className={cn(
              'absolute left-0 top-0 bottom-0 w-1 cursor-col-resize z-50 transition-colors',
              resizingSide === 'right'
                ? 'bg-emerald-500 shadow-[0_0_15px_#10b981]'
                : 'bg-transparent hover:bg-emerald-500/50'
            )}
          />

          {/* Tab bar */}
          <div
            className={cn(
              'px-3 py-2 border-b flex items-center justify-between shrink-0',
              dark ? 'border-white/5' : 'border-gray-100'
            )}
          >
            <div className="flex items-center gap-4">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveRightTab(tab.id)}
                  className={cn(
                    'flex flex-col transition-all',
                    activeRightTab === tab.id ? 'opacity-100' : 'opacity-40 hover:opacity-100'
                  )}
                  aria-label={tab.label}
                >
                  <span
                    className={cn(
                      'text-xs font-black uppercase tracking-[0.2em] italic',
                      activeRightTab === tab.id
                        ? dark ? 'text-emerald-400' : 'text-emerald-600'
                        : dark ? 'text-white' : 'text-black'
                    )}
                  >
                    {tab.label}
                  </span>
                  <div
                    className="h-0.5 w-full mt-1"
                    style={{
                      backgroundColor: activeRightTab === tab.id ? '#10b981' : 'transparent',
                    }}
                  />
                </button>
              ))}
            </div>
            <button onClick={() => setRightOpen(false)} className="p-1 hover:text-emerald-500 transition-colors" aria-label="Close panel">
              <X size={16} />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden relative custom-editor-scrollbar">
            {activeRightTab === 'preview' ? (
              <div className="w-full h-full flex flex-col">
                {/* Viewport size toggles */}
                <div className={cn(
                  'flex items-center justify-center gap-1 px-3 py-2 border-b shrink-0',
                  dark ? 'border-white/5' : 'border-gray-100'
                )}>
                  {(['desktop', 'tablet', 'mobile'] as const).map((vp) => {
                    const vpConfig = VIEWPORT_SIZES[vp]
                    const VpIcon = vpConfig.icon
                    const isActive = previewMode === vp
                    return (
                      <button
                        key={vp}
                        onClick={() => setPreviewMode(vp)}
                        className={cn(
                          'flex items-center gap-1.5 px-2.5 py-1 rounded-none border text-[10px] font-black uppercase italic tracking-wider transition-all',
                          isActive
                            ? dark
                              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                              : 'bg-emerald-50 border-emerald-200 text-emerald-600'
                            : dark
                              ? 'bg-white/5 border-white/5 text-gray-500 hover:text-gray-300'
                              : 'bg-gray-50 border-gray-200 text-gray-400 hover:text-gray-600'
                        )}
                        aria-label={`${vp} preview`}
                        title={`${vp} (${vpConfig.width}×${vpConfig.height})`}
                      >
                        <VpIcon size={11} />
                        {vp}
                      </button>
                    )
                  })}
                </div>

                {/* Preview Frame */}
                <div className="flex-1 flex items-center justify-center overflow-auto p-3">
                  {resolvedStorefrontUrl ? (
                    <div
                      className={cn(
                        'transition-all duration-300 border overflow-hidden bg-white',
                        dark ? 'border-white/10 shadow-[0_0_40px_rgba(0,0,0,0.5)]' : 'border-gray-200 shadow-2xl',
                        isDesktop ? 'w-full h-full' : 'rounded-[32px]'
                      )}
                      style={
                        isDesktop
                          ? undefined
                          : {
                              width: Math.min(viewport.width, rightWidth - 40),
                              height: viewport.height,
                            }
                      }
                    >
                      <iframe
                        allow="clipboard-read; clipboard-write"
                        ref={iframeRef}
                        src={`${resolvedStorefrontUrl}?preview=true&token=${previewToken || ''}&collection=${collectionSlug}&id=${documentId}&siteId=${pageSiteId}&viewport=${previewMode}`}
                        className="w-full h-full border-none rounded-none"
                        title="Live Preview"
                        sandbox="allow-same-origin allow-scripts allow-forms"
                      />
                    </div>
                  ) : (
                    <div className={cn(
                      'flex flex-col items-center justify-center h-full gap-3 text-center p-8',
                      dark ? 'bg-black/40' : 'bg-gray-50'
                    )}>
                      <Eye size={28} className={dark ? 'text-gray-600' : 'text-gray-300'} />
                      <div>
                        <p className={cn('text-xs font-black uppercase italic', dark ? 'text-gray-500' : 'text-gray-400')}>
                          Preview unavailable
                        </p>
                        <p className={cn('text-xs font-bold', dark ? 'text-gray-700' : 'text-gray-300')}>
                          Set VITE_STOREFRONT_URL to enable live preview
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : activeRightTab === 'comments' ? (
              <div className="w-full h-full p-3 overflow-y-auto custom-editor-scrollbar">
                <CommentsPanel
                  collection={isGlobal ? 'globals' : 'pages'}
                  documentId={documentId || ''}
                  theme={theme}
                />
              </div>
            ) : (
              /* Versions */
              <div className="w-full h-full p-3 overflow-y-auto custom-editor-scrollbar">
                {history.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
                    <History size={32} className={dark ? 'text-gray-700' : 'text-gray-300'} />
                    <div>
                      <p className={cn('text-xs font-black uppercase italic', dark ? 'text-gray-500' : 'text-gray-400')}>
                        No versions yet
                      </p>
                      <p className={cn('text-xs font-bold mt-1', dark ? 'text-gray-700' : 'text-gray-300')}>
                        Save your page to create a version snapshot
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {history.map((v, idx) => (
                      <div
                        key={v._id || v.id}
                        className={cn(
                          'group p-3 rounded-none border transition-all cursor-pointer space-y-1',
                          dark
                            ? 'bg-white/[0.02] border-white/5 hover:bg-white/[0.04]'
                            : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span className={cn('text-xs font-black uppercase italic', dark ? 'text-white' : 'text-black')}>
                            {idx === 0 ? 'Current' : `V.${history.length - idx}`}
                          </span>
                          <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                            {new Date(v.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 font-medium italic truncate">
                          {v.changeLog || 'Saved'}
                        </p>
                        {idx > 0 && (
                          <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-all mt-1.5">
                            <button
                              onClick={(e) => { e.stopPropagation(); onCompareDiff(v._id, history.length - idx) }}
                              className={cn(
                                'flex-1 py-1 border text-xs font-black uppercase italic tracking-widest text-center transition-all',
                                dark
                                  ? 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 hover:text-white'
                                  : 'bg-gray-100 border-gray-250 text-gray-700 hover:bg-gray-200 hover:text-black'
                              )}
                            >
                              Compare
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleRestore(v._id) }}
                              className="flex-1 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase italic tracking-widest text-center transition-all"
                            >
                              Restore
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  )
}
