import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Cpu, Plus, Globe, LogOut, Loader2, ArrowRight, Briefcase } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../lib/api'
import { useAuthStore } from '../store/authStore'
import { useTenantStore } from '../lib/tenantStore'

interface Site {
  _id: string
  id?: string
  name: string
  slug: string
  icon: string
  domain?: string
  description?: string
  ownerId: string
  workspaceId?: string
}

interface Workspace {
  _id?: string
  id?: string
  name: string
  slug: string
  ownerId: string
}

export default function SitePicker() {
  const navigate = useNavigate()
  const logout = useAuthStore((state) => state.logout)
  const setActiveSiteId = useTenantStore((state) => state.setActiveSiteId)
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [sites, setSites] = useState<Site[]>([])
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)

  // Workspace Creation Form State
  const [showNewWorkspaceModal, setShowNewWorkspaceModal] = useState(false)
  const [wsName, setWsName] = useState('')
  const [wsSlug, setWsSlug] = useState('')

  // Site Creation Form State
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [icon, setIcon] = useState('🌐')
  const [description, setDescription] = useState('')

  const fetchData = async () => {
    setLoading(true)
    try {
      // 1. Fetch workspaces
      const wsResponse = await api.get('/workspaces')
      const wsList = wsResponse.data?.data || []
      setWorkspaces(wsList)

      // Resolve active workspace ID
      let selectedWsId = localStorage.getItem('activeWorkspaceId')
      if (selectedWsId && !wsList.some((w: any) => (w._id || w.id) === selectedWsId)) {
        selectedWsId = null
      }
      if (!selectedWsId && wsList.length > 0) {
        selectedWsId = wsList[0]._id || wsList[0].id
      }
      setActiveWorkspaceId(selectedWsId)
      if (selectedWsId) {
        localStorage.setItem('activeWorkspaceId', selectedWsId)
      }

      // 2. Fetch sites
      const sitesResponse = await api.get('/sites')
      setSites(sitesResponse.data?.data || [])
    } catch (err: any) {
      toast.error('Failed to load workspaces and sites.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleSelectSite = (site: Site) => {
    const wsId = site.workspaceId || activeWorkspaceId
    if (wsId) {
      localStorage.setItem('activeWorkspaceId', wsId)
    }
    const siteId = site._id || site.id || ''
    localStorage.setItem('activeSiteId', siteId)
    localStorage.setItem('activeSiteName', site.name)
    localStorage.setItem('activeSiteSlug', site.slug)
    localStorage.setItem('activeSiteDomain', site.domain || '')
    
    // Update Zustand store
    setActiveSiteId(siteId, site.name)
    
    // Explicitly update default headers to ensure immediate accuracy
    api.defaults.headers['x-zenith-site-id'] = siteId
    
    toast.success(`Entering site: ${site.name}`)
    // Use navigate (not window.location.href) so the React tree stays alive
    // and React Query handles cache invalidation and refetching
    navigate('/')
  }

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!wsName || !wsSlug) {
      toast.error('Workspace name and slug are required.')
      return
    }

    try {
      const res = await api.post('/workspaces', {
        name: wsName,
        slug: wsSlug.toLowerCase(),
      })
      const newWs = res.data?.data
      toast.success('Workspace created successfully!')
      
      setWorkspaces((prev) => [...prev, newWs])
      const newWsId = newWs._id || newWs.id
      setActiveWorkspaceId(newWsId)
      localStorage.setItem('activeWorkspaceId', newWsId)

      setWsName('')
      setWsSlug('')
      setShowNewWorkspaceModal(false)
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed to create workspace.')
    }
  }

  const handleCreateSite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !slug) {
      toast.error('Name and slug are required fields.')
      return
    }
    if (!activeWorkspaceId) {
      toast.error('Please select or create a workspace first.')
      return
    }

    setCreating(true)
    try {
      const response = await api.post('/sites', {
        name,
        slug: slug.toLowerCase(),
        icon,
        description,
        workspaceId: activeWorkspaceId,
      })

      const newSite = response.data?.data
      toast.success('Site tenant created successfully!')

      // Append new site to state
      setSites((prev) => [...prev, newSite])
      setName('')
      setSlug('')
      setDescription('')
      setIcon('🌐')

      // Auto select and navigate to new site
      handleSelectSite(newSite)
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed to create site.')
    } finally {
      setCreating(false)
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  // Filter sites belonging to the active workspace tab
  const filteredSites = sites.filter(
    (site) => site.workspaceId === activeWorkspaceId
  )

  return (
    <div className="min-h-screen bg-[#0B0F19] text-white flex flex-col justify-between selection:bg-white selection:text-black">
      {/* 🚀 Sleek Minimal Top Navigation Header */}
      <header className="border-b border-white/[0.04] px-8 py-6 flex items-center justify-between backdrop-blur-md bg-[#0B0F19]/50 sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <div className="relative flex items-center justify-center w-8 h-8 rounded-none border border-white/[0.08] bg-white/5">
            <Cpu size={16} className="text-white animate-pulse" />
            <div className="absolute inset-0 blur-lg bg-white/10 rounded-none"></div>
          </div>
          <div>
            <span className="text-[12px] font-black tracking-[0.4em] uppercase text-white">
              Zenith
            </span>
            <span className="text-[10px] font-medium tracking-[0.2em] uppercase text-white/40 block -mt-1 font-mono">
              Platform Nucleus
            </span>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-4 py-2 border border-white/[0.08] bg-white/[0.02] hover:bg-white/10 text-[10px] font-black uppercase tracking-widest text-white/60 hover:text-white transition-all duration-300 font-mono"
        >
          <LogOut size={12} />
          Sign Out
        </button>
      </header>

      {/* 🔮 Cosmic Launchpad Core */}
      <main className="max-w-6xl w-full mx-auto px-6 py-12 flex-grow flex flex-col justify-center">
        <div className="max-w-2xl mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 border border-white/[0.08] bg-white/[0.03] text-[9px] font-black uppercase tracking-widest text-white/50 mb-4 rounded-none font-mono">
            <Globe size={10} className="animate-spin-slow" /> Hierarchical Workspace & Tenant Select
          </div>
          <h1 className="text-4xl md:text-5xl font-black uppercase tracking-[0.05em] leading-[1.1] mb-4">
            Select Site Tenant
          </h1>
          <p className="text-white/45 text-[13px] leading-relaxed">
            Welcome to Zenith multi-tenant launchpad. Isolate sites, media libraries, roles, and
            schema collections by selecting a Workspace, then choosing a Site.
          </p>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <Loader2 size={32} className="animate-spin text-white/50" />
            <p className="text-[10px] uppercase font-bold tracking-[0.2em] text-white/40 font-mono">
              Querying active workspaces...
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            {/* 📁 Workspace Selector Tabs */}
            <div className="border border-white/[0.06] bg-white/[0.01] p-6 rounded-none backdrop-blur-[12px]">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[9px] font-black uppercase tracking-widest text-white/40 font-mono">
                  Workspaces
                </span>
              </div>
              <div className="flex flex-wrap gap-3">
                {workspaces.map((ws) => {
                  const wsId = ws._id || ws.id
                  const isActive = activeWorkspaceId === wsId
                  return (
                    <button
                      key={wsId}
                      onClick={() => {
                        setActiveWorkspaceId(wsId || null)
                        if (wsId) {
                          localStorage.setItem('activeWorkspaceId', wsId)
                        }
                      }}
                      className={`flex items-center gap-3 px-5 py-3 transition-all duration-300 border ${
                        isActive
                          ? 'border-[#10B981] bg-[#10B981]/10 text-white shadow-[0_0_15px_rgba(16,185,129,0.25)]'
                          : 'border-white/[0.06] bg-white/[0.02] text-white/60 hover:border-white/[0.08] hover:text-white'
                      } rounded-none`}
                    >
                      <Briefcase size={14} className={isActive ? 'text-[#10B981]' : 'text-white/40'} />
                      <div className="text-left">
                        <span className="text-xs font-black uppercase tracking-wider block leading-tight">
                          {ws.name}
                        </span>
                        <span className="text-[8px] font-mono text-white/30 tracking-widest block font-bold uppercase">
                          /{ws.slug}
                        </span>
                      </div>
                    </button>
                  )
                })}

                <button
                  onClick={() => setShowNewWorkspaceModal(true)}
                  className="flex items-center gap-2 px-5 py-3 border border-dashed border-white/[0.08] hover:border-[#10B981]/50 text-[10px] font-black uppercase tracking-widest text-white/50 hover:text-[#10B981] transition-all duration-300 font-mono rounded-none"
                >
                  <Plus size={14} />
                  New Workspace
                </button>
              </div>
            </div>

            {/* Sites Grid & Tenant Creation Split View */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
              {/* Left Column: Filtered list of Sites */}
              <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {filteredSites.map((site) => {
                  const siteId = site._id || site.id || ''
                  return (
                    <div
                      key={siteId}
                      onClick={() => handleSelectSite(site)}
                      className="group relative border border-white/[0.06] bg-gradient-to-br from-white/[0.01] to-white/[0.03] hover:border-[#10B981]/50 p-6 flex flex-col justify-between h-48 cursor-pointer transition-all duration-500 overflow-hidden rounded-none shadow-[0_4px_30px_rgba(0,0,0,0.1)]"
                    >
                      {/* Glassmorph glow on hover */}
                      <div className="absolute inset-0 bg-white/[0.01] group-hover:bg-white/[0.04] transition-colors duration-500"></div>
                      <div className="absolute -right-16 -bottom-16 w-32 h-32 bg-white/5 rounded-none blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                      <div className="relative z-10 flex items-start justify-between">
                        <span className="text-3xl filter saturate-50 group-hover:saturate-100 transition-all duration-300">
                          {site.icon || '🌐'}
                        </span>
                        <span className="text-[9px] font-bold tracking-widest text-white/30 font-mono uppercase bg-white/5 px-2 py-1">
                          {site.slug}
                        </span>
                      </div>

                      <div className="relative z-10 mt-6">
                        <h3 className="text-lg font-black uppercase tracking-wider group-hover:text-[#10B981] transition-colors duration-300">
                          {site.name}
                        </h3>
                        <p className="text-white/40 text-[11px] mt-1 line-clamp-2 leading-relaxed">
                          {site.description || 'No description provided.'}
                        </p>
                      </div>

                      <div className="relative z-10 flex items-center justify-between border-t border-white/[0.05] pt-3 mt-4">
                        <span className="text-[9px] font-black uppercase tracking-widest text-white/30 group-hover:text-white/80 transition-colors duration-300 flex items-center gap-1 font-mono">
                          Enter Site{' '}
                          <ArrowRight
                            size={10}
                            className="transform group-hover:translate-x-1 transition-transform"
                          />
                        </span>
                      </div>
                    </div>
                  )
                })}

                {filteredSites.length === 0 && (
                  <div className="col-span-2 border border-dashed border-white/[0.08] p-12 text-center flex flex-col items-center justify-center gap-4 rounded-none">
                    <Globe size={40} className="text-white/20" />
                    <div>
                      <h3 className="text-[12px] font-black uppercase tracking-widest">
                        No sites inside workspace
                      </h3>
                      <p className="text-white/40 text-[11px] mt-1 max-w-xs mx-auto">
                        Create your first site tenant on the right to start building under this workspace.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Panel for Creating New Site inside active workspace */}
              <div 
                className="p-8 shadow-[0_4px_30px_rgba(0,0,0,0.15)]"
                style={{
                  backgroundColor: 'rgba(17, 24, 39, 0.65)',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '12px',
                }}
              >
                <div className="flex items-center gap-2 mb-6">
                  <Plus size={16} className="text-[#10B981]" />
                  <h2 className="text-[12px] font-black uppercase tracking-[0.2em]">New Site Tenant</h2>
                </div>

                <form onSubmit={handleCreateSite} className="space-y-4">
                  <div>
                    <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1.5 font-mono">
                      Site Name
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value)
                        if (!slug) {
                          setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-'))
                        }
                      }}
                      placeholder="e.g. Zenith E-Commerce"
                      className="w-full bg-white/[0.02] border border-white/[0.08] focus:border-[#10B981]/50 px-4 py-3 text-[12px] focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-black transition-colors rounded-none placeholder:text-white/25 text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1.5 font-mono">
                      Unique Slug / Identifier
                    </label>
                    <input
                      type="text"
                      required
                      value={slug}
                      onChange={(e) =>
                        setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-'))
                      }
                      placeholder="e.g. zenith-commerce"
                      className="w-full bg-white/[0.02] border border-white/[0.08] focus:border-[#10B981]/50 px-4 py-3 text-[12px] focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-black transition-colors rounded-none placeholder:text-white/25 text-white"
                    />
                  </div>

                  <div className="grid grid-cols-4 gap-2">
                    <div className="col-span-1">
                      <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1.5 font-mono">
                        Icon
                      </label>
                      <select
                        value={icon}
                        onChange={(e) => setIcon(e.target.value)}
                        className="w-full bg-white/[0.02] border border-white/[0.08] focus:border-[#10B981]/50 px-2 py-3 text-[14px] focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-black transition-colors rounded-none text-white"
                      >
                        <option value="🌐" className="bg-gray-950 text-white">🌐</option>
                        <option value="🛒" className="bg-gray-950 text-white">🛒</option>
                        <option value="🎨" className="bg-gray-950 text-white">🎨</option>
                        <option value="📚" className="bg-gray-950 text-white">📚</option>
                        <option value="⚡" className="bg-gray-950 text-white">⚡</option>
                        <option value="🚀" className="bg-gray-950 text-white">🚀</option>
                        <option value="💼" className="bg-gray-950 text-white">💼</option>
                      </select>
                    </div>
                    <div className="col-span-3">
                      <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1.5 font-mono">
                        Description
                      </label>
                      <input
                        type="text"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="e.g. Storefront platform"
                        className="w-full bg-white/[0.02] border border-white/[0.08] focus:border-[#10B981]/50 px-4 py-3 text-[12px] focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-black transition-colors rounded-none placeholder:text-white/25 text-white"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={creating || !activeWorkspaceId}
                    className="w-full bg-white text-black hover:bg-white/90 disabled:bg-white/20 disabled:text-white/40 px-6 py-3.5 text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2 transition-all duration-300 font-mono shadow-[0_4px_15px_rgba(255,255,255,0.1)]"
                  >
                    {creating ? (
                      <>
                        <Loader2 size={12} className="animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>Create Site Tenant</>
                    )}
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Workspace Creation Modal */}
      {showNewWorkspaceModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0B0F19]/80 backdrop-blur-md">
          <div
            className="w-full max-w-md p-8 relative overflow-hidden shadow-[0_4px_30px_rgba(0,0,0,0.5)]"
            style={{
              backgroundColor: 'rgba(17, 24, 39, 0.85)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '12px',
            }}
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Briefcase size={16} className="text-[#10B981]" />
                <h2 className="text-[12px] font-black uppercase tracking-[0.2em]">New Workspace</h2>
              </div>
              <button
                onClick={() => setShowNewWorkspaceModal(false)}
                className="text-white/40 hover:text-white text-xs font-mono"
              >
                [CLOSE]
              </button>
            </div>

            <form onSubmit={handleCreateWorkspace} className="space-y-4">
              <div>
                <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1.5 font-mono">
                  Workspace Name
                </label>
                <input
                  type="text"
                  required
                  value={wsName}
                  onChange={(e) => {
                    setWsName(e.target.value)
                    if (!wsSlug) {
                      setWsSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-'))
                    }
                  }}
                  placeholder="e.g. Zenith Studio"
                  className="w-full bg-white/[0.02] border border-white/[0.08] focus:border-[#10B981]/50 px-4 py-3 text-[12px] focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-black transition-colors rounded-none placeholder:text-white/25 text-white"
                />
              </div>

              <div>
                <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1.5 font-mono">
                  Unique Slug / Identifier
                </label>
                <input
                  type="text"
                  required
                  value={wsSlug}
                  onChange={(e) =>
                    setWsSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-'))
                  }
                  placeholder="e.g. zenith-studio"
                  className="w-full bg-white/[0.02] border border-white/[0.08] focus:border-[#10B981]/50 px-4 py-3 text-[12px] focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-black transition-colors rounded-none placeholder:text-white/25 text-white"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewWorkspaceModal(false)}
                  className="flex-1 border border-white/[0.08] hover:bg-white/5 px-6 py-3.5 text-[10px] font-black uppercase tracking-[0.2em] text-white transition-colors duration-300 font-mono"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-[#10B981] text-white hover:bg-[#059669] px-6 py-3.5 text-[10px] font-black uppercase tracking-[0.2em] transition-colors duration-300 font-mono shadow-[0_0_15px_rgba(16,185,129,0.4)]"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🌑 Footer */}
      <footer className="border-t border-white/[0.04] px-8 py-6 flex flex-col md:flex-row items-center justify-between text-[9px] font-bold uppercase tracking-widest text-white/35 font-mono">
        <div>Zenith Engine v2.4.0-CORE-OS</div>
        <div className="flex items-center gap-6 mt-4 md:mt-0">
          <a href="#" className="hover:text-white transition-colors">
            Documentation
          </a>
          <a href="#" className="hover:text-white transition-colors">
            API Reference
          </a>
          <a href="#" className="hover:text-white transition-colors">
            Enterprise Nucleus
          </a>
        </div>
      </footer>
    </div>
  )
}
