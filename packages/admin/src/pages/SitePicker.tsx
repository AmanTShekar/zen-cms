import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Cpu, Plus, Globe, LogOut, Loader2, ArrowRight } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../lib/api'
import { useAuthStore } from '../store/authStore'

interface Site {
  _id: string
  name: string
  slug: string
  icon: string
  description?: string
  ownerId: string
}

export default function SitePicker() {
  const navigate = useNavigate()
  const logout = useAuthStore((state) => state.logout)
  const [sites, setSites] = useState<Site[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)

  // Form State for creating new site
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [icon, setIcon] = useState('🌐')
  const [description, setDescription] = useState('')

  const fetchSites = async () => {
    setLoading(true)
    try {
      const response = await api.get('/sites')
      setSites(response.data?.data || [])
    } catch (err: any) {
      toast.error('Failed to load site workspaces.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSites()
  }, [])

  const handleSelectSite = (site: Site) => {
    localStorage.setItem('activeSiteId', site._id)
    localStorage.setItem('activeSiteName', site.name)
    localStorage.setItem('activeSiteSlug', site.slug)
    toast.success(`Entering workspace: ${site.name}`)
    navigate('/')
  }

  const handleCreateSite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !slug) {
      toast.error('Name and slug are required fields.')
      return
    }

    setCreating(true)
    try {
      const response = await api.post('/sites', {
        name,
        slug: slug.toLowerCase(),
        icon,
        description,
      })

      const newSite = response.data?.data
      toast.success('Workspace created successfully!')

      // Auto select and navigate to new site workspace
      handleSelectSite(newSite)
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed to create workspace.')
    } finally {
      setCreating(false)
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col justify-between selection:bg-white selection:text-black">
      {/* 🚀 Sleek Minimal Top Navigation Header */}
      <header className="border-b border-white/[0.04] px-8 py-6 flex items-center justify-between backdrop-blur-md bg-black/50 sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <div className="relative flex items-center justify-center w-8 h-8 rounded-full border border-white/20 bg-white/5">
            <Cpu size={16} className="text-white animate-pulse" />
            <div className="absolute inset-0 blur-lg bg-white/10 rounded-full"></div>
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
          <div className="inline-flex items-center gap-2 px-3 py-1 border border-white/10 bg-white/[0.03] text-[9px] font-black uppercase tracking-widest text-white/50 mb-4 rounded-full font-mono">
            <Globe size={10} className="animate-spin-slow" /> Global Workspace Selection
          </div>
          <h1 className="text-4xl md:text-5xl font-black uppercase tracking-[0.05em] leading-[1.1] mb-4">
            Select Site Workspace
          </h1>
          <p className="text-white/45 text-[13px] leading-relaxed">
            Welcome to Zenith multi-tenant launchpad. Isolate widgets, media libraries, roles, and
            schema collections per tenant. Built entirely open-source.
          </p>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <Loader2 size={32} className="animate-spin text-white/50" />
            <p className="text-[10px] uppercase font-bold tracking-[0.2em] text-white/40 font-mono">
              Quering Active tenants...
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            {/* Grid of Workspaces */}
            <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {sites.map((site) => (
                <div
                  key={site._id}
                  onClick={() => handleSelectSite(site)}
                  className="group relative border border-white/[0.06] bg-gradient-to-br from-white/[0.01] to-white/[0.03] hover:border-white/30 p-6 flex flex-col justify-between h-48 cursor-pointer transition-all duration-500 overflow-hidden"
                >
                  {/* Glassmorph glow on hover */}
                  <div className="absolute inset-0 bg-white/[0.01] group-hover:bg-white/[0.04] transition-colors duration-500"></div>
                  <div className="absolute -right-16 -bottom-16 w-32 h-32 bg-white/5 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                  <div className="relative z-10 flex items-start justify-between">
                    <span className="text-3xl filter saturate-50 group-hover:saturate-100 transition-all duration-300">
                      {site.icon || '🌐'}
                    </span>
                    <span className="text-[9px] font-bold tracking-widest text-white/30 font-mono uppercase bg-white/5 px-2 py-1">
                      {site.slug}
                    </span>
                  </div>

                  <div className="relative z-10 mt-6">
                    <h3 className="text-lg font-black uppercase tracking-wider group-hover:text-white transition-colors duration-300">
                      {site.name}
                    </h3>
                    <p className="text-white/40 text-[11px] mt-1 line-clamp-2 leading-relaxed">
                      {site.description || 'No description provided.'}
                    </p>
                  </div>

                  <div className="relative z-10 flex items-center justify-between border-t border-white/[0.05] pt-3 mt-4">
                    <span className="text-[9px] font-black uppercase tracking-widest text-white/30 group-hover:text-white/80 transition-colors duration-300 flex items-center gap-1 font-mono">
                      Enter Workspace{' '}
                      <ArrowRight
                        size={10}
                        className="transform group-hover:translate-x-1 transition-transform"
                      />
                    </span>
                  </div>
                </div>
              ))}

              {sites.length === 0 && (
                <div className="col-span-2 border border-dashed border-white/10 p-12 text-center flex flex-col items-center justify-center gap-4">
                  <Globe size={40} className="text-white/20" />
                  <div>
                    <h3 className="text-[12px] font-black uppercase tracking-widest">
                      No site workspaces
                    </h3>
                    <p className="text-white/40 text-[11px] mt-1 max-w-xs mx-auto">
                      Create your first site workspace on the right to start isolating collections,
                      logs, and dashboard widgets.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Panel for Creating New Workspace */}
            <div className="border border-white/[0.06] bg-gradient-to-b from-white/[0.02] to-transparent p-8">
              <div className="flex items-center gap-2 mb-6">
                <Plus size={16} className="text-white" />
                <h2 className="text-[12px] font-black uppercase tracking-[0.2em]">New Workspace</h2>
              </div>

              <form onSubmit={handleCreateSite} className="space-y-4">
                <div>
                  <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1.5 font-mono">
                    Workspace Name
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
                    className="w-full bg-white/[0.02] border border-white/10 focus:border-white/40 px-4 py-3 text-[12px] focus:outline-none transition-colors rounded-none placeholder:text-white/25"
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
                    className="w-full bg-white/[0.02] border border-white/10 focus:border-white/40 px-4 py-3 text-[12px] focus:outline-none transition-colors rounded-none placeholder:text-white/25"
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
                      className="w-full bg-white/[0.02] border border-white/10 focus:border-white/40 px-2 py-3 text-[14px] focus:outline-none transition-colors rounded-none"
                    >
                      <option value="🌐">🌐</option>
                      <option value="🛒">🛒</option>
                      <option value="🎨">🎨</option>
                      <option value="📚">📚</option>
                      <option value="⚡">⚡</option>
                      <option value="🚀">🚀</option>
                      <option value="💼">💼</option>
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
                      placeholder="e.g. Zenith E-Commerce storefront platform"
                      className="w-full bg-white/[0.02] border border-white/10 focus:border-white/40 px-4 py-3 text-[12px] focus:outline-none transition-colors rounded-none placeholder:text-white/25"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={creating}
                  className="w-full bg-white text-black hover:bg-white/90 disabled:bg-white/20 disabled:text-white/40 px-6 py-3.5 text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2 transition-colors duration-300 font-mono"
                >
                  {creating ? (
                    <>
                      <Loader2 size={12} className="animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>Create Workspace</>
                  )}
                </button>
              </form>
            </div>
          </div>
        )}
      </main>

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
