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
 const user = useAuthStore((state) => state.user)
 const setActiveSiteId = useTenantStore((state) => state.setActiveSiteId)
 const [workspaces, setWorkspaces] = useState<Workspace[]>([])
 const [sites, setSites] = useState<Site[]>([])
 const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null)
 const [loading, setLoading] = useState(true)
 const [creating, setCreating] = useState(false)

 // Workspace Creation Form State
 const [showNewWorkspaceModal, setShowNewWorkspaceModal] = useState(false)
 const [showDeleteWorkspaceModal, setShowDeleteWorkspaceModal] = useState(false)
 const [wsName, setWsName] = useState('')
 const [wsSlug, setWsSlug] = useState('')

 // Site Creation Form State
 const [name, setName] = useState('')
 const [slug, setSlug] = useState('')
 const [icon, setIcon] = useState('')
 const [description, setDescription] = useState('')

 const activeWorkspace = workspaces.find((w) => (w._id || w.id) === activeWorkspaceId)
 const isWorkspaceOwner = activeWorkspace && activeWorkspace.ownerId === user?.id

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
 setIcon('')

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
 <div className="flex-1 w-full min-h-0 bg-app text-z-primary flex flex-col justify-between overflow-y-auto overflow-x-hidden">
 {/*  Sleek Minimal Top Navigation Header */}
 <header className="border-b border-z-border px-8 py-6 flex items-center justify-between backdrop-blur-md bg-z-header sticky top-0 z-50">
 <div className="flex items-center gap-4">
 <div className="relative flex items-center justify-center w-8 h-8 rounded-none-none border border-z-border bg-z-hover">
 <Loader2 size={16} className="text-z-primary animate-spin opacity-80" strokeWidth={1.5} />
 <div className="absolute inset-0 blur-lg bg-z-hover rounded-none-none"></div>
 </div>
 <div>
 <span className="text-sm font-semibold text-z-primary">
 Zenith
 </span>
 <span className="text-sm font-medium text-z-secondary block -mt-1 font-mono">
 Platform Nucleus
 </span>
 </div>
 </div>

 <button
 onClick={handleLogout}
 className="flex items-center gap-2 px-4 py-2 border border-z-border bg-z-panel hover:bg-[var(--z-bg-hover)] text-sm font-semibold text-z-primary/60 hover:text-z-primary transition-all duration-300 font-mono"
 >
 <LogOut size={12} />
 Sign Out
 </button>
 </header>

 {/*  Cosmic Launchpad Core */}
 <main className="max-w-6xl w-full mx-auto px-6 py-12 flex-grow flex flex-col justify-start">
 <div className="max-w-2xl mb-12">
 <div className="inline-flex items-center gap-2 px-3 py-1 border border-z-border bg-z-hover text-sm font-semibold text-z-primary/50 mb-4 rounded-none-none font-mono">
 <Globe size={10} className="animate-spin-slow" /> Hierarchical Workspace & Tenant Select
 </div>
 <h1 className="text-4xl md:text-5xl font-semibold leading-[1.1] mb-4">
 Select Site Tenant
 </h1>
 <p className="text-z-secondary text-[13px] leading-relaxed">
 Welcome to Zenith multi-tenant launchpad. Isolate sites, media libraries, roles, and
 schema collections by selecting a Workspace, then choosing a Site.
 </p>
 </div>

 {loading ? (
 <div className="flex flex-col items-center justify-center py-24 gap-4">
 <Loader2 size={32} className="animate-spin text-z-secondary" />
 <p className="text-sm font-bold text-z-secondary font-mono">
 Querying active workspaces...
 </p>
 </div>
 ) : (
 <div className="flex flex-col gap-8">
 {/*  Workspace Selector Tabs */}
 <div className="border border-z-border bg-z-panel p-6 rounded-none-none backdrop-blur-[12px]">
 <div className="flex items-center justify-between mb-4">
 <span className="text-sm font-semibold text-z-primary/40 font-mono">
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
 ? 'border-[var(--z-active-border)] bg-[var(--z-active-bg)] text-[var(--z-active-text)] shadow-sm'
 : 'border-z-border bg-z-panel text-z-secondary hover:border-z-border hover:text-z-primary'
 } rounded-none-none`}
 >
 <Briefcase size={14} className={isActive ? 'text-[var(--z-active-text)]' : 'text-z-secondary'} />
 <div className="text-left">
 <span className="text-xs font-semibold block leading-tight">
 {ws.name}
 </span>
 <span className="text-sm font-mono text-z-secondary block font-bold">
 /{ws.slug}
 </span>
 </div>
 </button>
 )
 })}

 {isWorkspaceOwner && (
 <button
 onClick={() => setShowDeleteWorkspaceModal(true)}
 className="flex items-center gap-2 px-5 py-3 border border-red-900/30 hover:border-red-500/50 hover:bg-red-950/10 text-sm font-semibold text-red-500/50 hover:text-red-500 transition-all duration-300 font-mono rounded-none-none"
 >
 Delete Workspace
 </button>
 )}
 <button
 onClick={() => setShowNewWorkspaceModal(true)}
 className="flex items-center gap-2 px-5 py-3 border border-dashed border-z-border hover:border-[var(--z-active-border)] text-sm font-semibold text-z-primary/50 hover:text-[var(--z-active-text)] transition-all duration-300 font-mono rounded-none-none"
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
 className="group relative border border-z-border bg-z-panel hover:border-[var(--z-active-border)] p-6 flex flex-col justify-between h-full min-h-[12rem] cursor-pointer transition-all duration-500 overflow-hidden rounded-none-none shadow-sm"
 >
 {/* Glassmorph glow on hover */}
 <div className="absolute inset-0 bg-z-panel group-hover:bg-z-hover transition-colors duration-500"></div>
 <div className="absolute -right-16 -bottom-16 w-32 h-32 bg-z-hover rounded-none-none blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

 <div className="relative z-10 flex items-start justify-between gap-4">
 <span className="text-3xl filter saturate-50 group-hover:saturate-100 transition-all duration-300 flex-shrink-0">
 {site.icon || ''}
 </span>
 <span className="text-sm font-bold text-z-secondary font-mono bg-z-hover px-2 py-1 truncate max-w-[60%]">
 {site.slug}
 </span>
 </div>

 <div className="relative z-10 mt-6 flex-grow">
 <h3 className="text-lg font-semibold group-hover:text-[var(--z-active-text)] transition-colors duration-300 break-words line-clamp-3">
 {site.name}
 </h3>
 <p className="text-z-secondary text-sm mt-1 line-clamp-3 leading-relaxed break-words">
 {site.description || 'No description provided.'}
 </p>
 </div>

 <div className="relative z-10 flex items-center justify-between border-t border-z-border pt-3 mt-4">
 <span className="text-sm font-semibold text-z-primary/30 group-hover:text-z-primary/80 transition-colors duration-300 flex items-center gap-1 font-mono">
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
 <div className="col-span-2 border border-dashed border-z-border p-12 text-center flex flex-col items-center justify-center gap-4 rounded-none-none">
 <Globe size={40} className="text-z-secondary" />
 <div>
 <h3 className="text-sm font-semibold">
 No sites inside workspace
 </h3>
 <p className="text-z-secondary text-sm mt-1 max-w-xs mx-auto">
 Create your first site tenant on the right to start building under this workspace.
 </p>
 </div>
 </div>
 )}
 </div>

 {/* Right Column: Panel for Creating New Site inside active workspace */}
 <div className="p-8 shadow-sm bg-z-panel backdrop-blur-xl border border-z-border">
 <div className="flex items-center gap-2 mb-6">
 <Plus size={16} className="text-[var(--z-active-text)]" />
 <h2 className="text-sm font-semibold">New Site Tenant</h2>
 </div>

 <form onSubmit={handleCreateSite} className="space-y-4">
 <div>
 <label className="block text-sm font-semibold text-z-primary/40 mb-1.5 font-mono">
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
 className="w-full bg-z-panel border border-z-border focus:border-[var(--z-accent)]/50 px-4 py-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-z-active-border focus-visible:ring-offset-1 focus-visible:ring-offset-black transition-colors rounded-none-none placeholder:text-z-secondary text-z-primary"
 />
 </div>

 <div>
 <label className="block text-sm font-semibold text-z-primary/40 mb-1.5 font-mono">
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
 className="w-full bg-z-panel border border-z-border focus:border-[var(--z-accent)]/50 px-4 py-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-z-active-border focus-visible:ring-offset-1 focus-visible:ring-offset-black transition-colors rounded-none-none placeholder:text-z-secondary text-z-primary"
 />
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
 <div className="col-span-1">
 <label className="block text-sm font-semibold text-z-primary/40 mb-1.5 font-mono">
 Icon
 </label>
 <select
 value={icon}
 onChange={(e) => setIcon(e.target.value)}
 className="w-full bg-z-panel border border-z-border focus:border-[var(--z-accent)]/50 px-2 py-3 text-[14px] focus:outline-none focus-visible:ring-2 focus-visible:ring-z-active-border focus-visible:ring-offset-1 focus-visible:ring-offset-black transition-colors rounded-none-none text-z-primary"
 >
 <option value="" className="bg-z-base text-z-primary"></option>
 <option value="" className="bg-z-base text-z-primary"></option>
 <option value="" className="bg-z-base text-z-primary"></option>
 <option value="" className="bg-z-base text-z-primary"></option>
 <option value="" className="bg-z-base text-z-primary"></option>
 <option value="" className="bg-z-base text-z-primary"></option>
 <option value="" className="bg-z-base text-z-primary"></option>
 </select>
 </div>
 <div className="col-span-3">
 <label className="block text-sm font-semibold text-z-primary/40 mb-1.5 font-mono">
 Description
 </label>
 <input
 type="text"
 value={description}
 onChange={(e) => setDescription(e.target.value)}
 placeholder="e.g. Storefront platform"
 className="w-full bg-z-panel border border-z-border focus:border-[var(--z-accent)]/50 px-4 py-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-z-active-border focus-visible:ring-offset-1 focus-visible:ring-offset-black transition-colors rounded-none-none placeholder:text-z-secondary text-z-primary"
 />
 </div>
 </div>

 <button
 type="submit"
 disabled={creating || !activeWorkspaceId}
 className="w-full bg-z-panel text-z-primary hover:bg-z-panel/90 disabled:bg-z-hover disabled:text-z-secondary px-6 py-3.5 text-sm font-semibold flex items-center justify-center gap-2 transition-all duration-300 font-mono shadow-sm"
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
 <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[var(--z-bg-modal)] backdrop-blur-md">
 <div className="w-full max-w-md p-8 relative overflow-hidden shadow-sm bg-z-panel backdrop-blur-xl border border-z-border">
 <div className="flex items-center justify-between mb-6">
 <div className="flex items-center gap-2">
 <Briefcase size={16} className="text-[var(--z-active-text)]" />
 <h2 className="text-sm font-semibold">New Workspace</h2>
 </div>
 <button
 onClick={() => setShowNewWorkspaceModal(false)}
 className="text-z-secondary hover:text-z-primary text-xs font-mono"
 >
 [CLOSE]
 </button>
 </div>

 <form onSubmit={handleCreateWorkspace} className="space-y-4">
 <div>
 <label className="block text-sm font-semibold text-z-primary/40 mb-1.5 font-mono">
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
 className="w-full bg-z-panel border border-z-border focus:border-[var(--z-accent)]/50 px-4 py-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-z-active-border focus-visible:ring-offset-1 focus-visible:ring-offset-black transition-colors rounded-none-none placeholder:text-z-secondary text-z-primary"
 />
 </div>

 <div>
 <label className="block text-sm font-semibold text-z-primary/40 mb-1.5 font-mono">
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
 className="w-full bg-z-panel border border-z-border focus:border-[var(--z-accent)]/50 px-4 py-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-z-active-border focus-visible:ring-offset-1 focus-visible:ring-offset-black transition-colors rounded-none-none placeholder:text-z-secondary text-z-primary"
 />
 </div>

 <div className="flex gap-3 pt-2">
 <button
 type="button"
 onClick={() => setShowNewWorkspaceModal(false)}
 className="flex-1 border border-z-border hover:bg-z-hover px-6 py-3.5 text-sm font-semibold text-z-primary transition-colors duration-300 font-mono"
 >
 Cancel
 </button>
 <button
 type="submit"
 className="flex-1 bg-[var(--z-accent)] text-z-primary hover:bg-[#059669] px-6 py-3.5 text-sm font-semibold transition-colors duration-300 font-mono shadow-sm"
 >
 Create
 </button>
 </div>
 </form>
 </div>
 </div>
 )}

 {/* Workspace Deletion Modal */}
 {showDeleteWorkspaceModal && (
 <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[var(--z-bg-modal)] backdrop-blur-md">
 <div className="w-full max-w-md p-8 relative overflow-hidden shadow-sm bg-z-panel backdrop-blur-xl border border-red-900/30">
 <div className="flex items-center justify-between mb-6">
 <div className="flex items-center gap-2">
 <Briefcase size={16} className="text-red-500" />
 <h2 className="text-sm font-semibold text-red-500">Delete Workspace</h2>
 </div>
 <button
 onClick={() => setShowDeleteWorkspaceModal(false)}
 className="text-z-secondary hover:text-z-primary text-xs font-mono"
 >
 [CLOSE]
 </button>
 </div>
 
 <div className="space-y-6">
 <p className="text-sm text-z-secondary leading-relaxed">
 Are you absolutely sure you want to permanently delete this workspace and all of its associated sites, content, and media? This action cannot be undone.
 </p>
 <div className="flex gap-3 pt-2">
 <button
 type="button"
 onClick={() => setShowDeleteWorkspaceModal(false)}
 className="flex-1 border border-z-border hover:bg-z-hover px-6 py-3.5 text-sm font-semibold text-z-primary transition-colors duration-300 font-mono"
 >
 Cancel
 </button>
 <button
 type="button"
 onClick={() => {
 api.delete(`/workspaces/${activeWorkspaceId}`).then(() => {
 toast.success('Workspace deleted')
 setShowDeleteWorkspaceModal(false)
 fetchData()
 }).catch((err: any) => {
 toast.error(err.response?.data?.error?.message || 'Failed to delete workspace')
 })
 }}
 className="flex-1 bg-red-950/20 text-red-500 border border-red-900/30 hover:bg-red-500 hover:text-z-logo-text px-6 py-3.5 text-sm font-semibold transition-colors duration-300 font-mono shadow-sm"
 >
 Permanently Delete
 </button>
 </div>
 </div>
 </div>
 </div>
 )}


 {/*  Footer */}
 <footer className="border-t border-z-border px-8 py-6 flex flex-col md:flex-row items-center justify-between text-sm font-bold text-z-primary/35 font-mono">
 <div>Zenith Engine v2.4.0-CORE-OS</div>
 <div className="flex items-center gap-6 mt-4 md:mt-0">
 <a href="#" className="hover:text-z-primary transition-colors">
 Documentation
 </a>
 <a href="#" className="hover:text-z-primary transition-colors">
 API Reference
 </a>
 <a href="#" className="hover:text-z-primary transition-colors">
 Enterprise Nucleus
 </a>
 </div>
 </footer>
 </div>
 )
}
