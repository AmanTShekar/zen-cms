import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Mail, Plus, Send, Loader2, Trash2, Edit } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { cn } from '../lib/utils'
import api from '../lib/api'
import toast from 'react-hot-toast'

interface Campaign {
  id: string
  subject: string
  body: string
  status: 'draft' | 'sending' | 'sent'
  audience: string
  sentAt?: string
  createdAt: string
}

const CampaignsPage: React.FC = () => {
  const { theme } = useTheme()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [activeCampaign, setActiveCampaign] = useState<Partial<Campaign> | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadCampaigns()
  }, [])

  const loadCampaigns = async () => {
    try {
      const res = await api.get('/system/campaigns')
      setCampaigns(res.data.data)
    } catch {
      toast.error('Failed to load campaigns')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!activeCampaign?.subject) {
      toast.error('Campaign subject is required')
      return
    }
    setSaving(true)
    try {
      if (activeCampaign.id) {
        await api.put(`/system/campaigns/${activeCampaign.id}`, activeCampaign)
        toast.success('Campaign updated')
      } else {
        await api.post('/system/campaigns', activeCampaign)
        toast.success('Campaign created')
      }
      loadCampaigns()
      setActiveCampaign(null)
    } catch {
      toast.error('Failed to save campaign')
    } finally {
      setSaving(false)
    }
  }

  const handleSend = async (id: string) => {
    if (!confirm('Are you sure you want to send this campaign?')) return
    try {
      await api.post(`/system/campaigns/${id}/send`)
      toast.success('Campaign sent')
      loadCampaigns()
    } catch {
      toast.error('Failed to send campaign')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this campaign?')) return
    try {
      await api.delete(`/system/campaigns/${id}`)
      toast.success('Campaign deleted')
      loadCampaigns()
    } catch {
      toast.error('Failed to delete campaign')
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden">
      <div className="p-8 pb-4 flex items-center justify-between shrink-0 border-b border-white/[0.05]">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-widest italic">Email Campaigns</h1>
          <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mt-1">Manage Newsletters and Announcements</p>
        </div>
        <button
          onClick={() => setActiveCampaign({ subject: '', body: '', audience: 'all' })}
          className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase tracking-widest shadow-lg transition-all"
        >
          <Plus size={14} />
          New Campaign
        </button>
      </div>

      <div className="flex-1 overflow-auto p-8 relative">
        {activeCampaign ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-3xl mx-auto space-y-6"
          >
            <div className={cn(
              'p-6 border space-y-4',
              theme === 'dark' ? 'bg-white/[0.02] border-white/5' : 'bg-white border-gray-100'
            )}>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-emerald-500 border-b border-emerald-500/20 pb-2">Campaign Details</h3>
                <button
                  onClick={() => setActiveCampaign(null)}
                  className="text-[9px] font-bold text-gray-500 uppercase hover:text-white"
                >
                  Cancel
                </button>
              </div>

              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Subject Line</label>
                  <input
                    type="text"
                    value={activeCampaign.subject || ''}
                    onChange={(e) => setActiveCampaign({ ...activeCampaign, subject: e.target.value })}
                    className={cn(
                      'w-full border p-3 text-[11px] font-bold outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-black transition-colors',
                      theme === 'dark' ? 'bg-black border-white/10 focus:border-emerald-500' : 'bg-gray-50 border-gray-200 focus:border-emerald-500'
                    )}
                    placeholder="Exciting News from Zenith"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Audience</label>
                  <select
                    value={activeCampaign.audience || 'all'}
                    onChange={(e) => setActiveCampaign({ ...activeCampaign, audience: e.target.value })}
                    className={cn(
                      'w-full border p-3 text-[11px] font-bold outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-black transition-colors',
                      theme === 'dark' ? 'bg-black border-white/10 focus:border-emerald-500 text-white' : 'bg-gray-50 border-gray-200 focus:border-emerald-500 text-black'
                    )}
                  >
                    <option value="all" className="text-black">All Subscribers</option>
                    <option value="active" className="text-black">Active Users</option>
                    <option value="inactive" className="text-black">Inactive Users</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Email Body</label>
                  <textarea
                    value={activeCampaign.body || ''}
                    onChange={(e) => setActiveCampaign({ ...activeCampaign, body: e.target.value })}
                    rows={10}
                    className={cn(
                      'w-full border p-3 text-[11px] font-mono outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-black transition-colors',
                      theme === 'dark' ? 'bg-black border-white/10 focus:border-emerald-500' : 'bg-gray-50 border-gray-200 focus:border-emerald-500'
                    )}
                    placeholder="Hello {{name}}, we have some exciting news..."
                  />
                </div>
              </div>
              <div className="pt-4 flex justify-end">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase tracking-widest shadow-lg transition-all"
                >
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />}
                  Save Draft
                </button>
              </div>
            </div>
          </motion.div>
        ) : (
          <div className="grid gap-4 max-w-5xl mx-auto">
            {loading ? (
              <div className="flex justify-center p-8"><Loader2 className="animate-spin text-gray-400" size={24} /></div>
            ) : campaigns.length === 0 ? (
              <div className="text-center p-12 border border-dashed border-gray-500/20 text-gray-500">
                <p className="text-[12px] font-black uppercase tracking-widest italic mb-2">No Campaigns</p>
                <p className="text-[10px] font-bold uppercase tracking-widest">Create a new email campaign to get started.</p>
              </div>
            ) : (
              campaigns.map(c => (
                <div key={c.id} className={cn(
                  'flex items-center justify-between p-5 border transition-colors',
                  theme === 'dark' ? 'bg-white/[0.02] border-white/5 hover:bg-white/[0.04]' : 'bg-white border-gray-100 hover:bg-gray-50'
                )}>
                  <div>
                    <h4 className="text-[12px] font-black uppercase tracking-widest italic flex items-center gap-2">
                      {c.subject}
                      {c.status === 'draft' && <span className="px-2 py-0.5 bg-gray-500/20 text-gray-400 text-[8px] rounded-full">Draft</span>}
                      {c.status === 'sent' && <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-[8px] rounded-full">Sent</span>}
                    </h4>
                    <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mt-1">
                      Audience: {c.audience} • Created: {new Date(c.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {c.status === 'draft' && (
                      <>
                        <button
                          onClick={() => setActiveCampaign(c)}
                          className="p-2 text-emerald-400 hover:bg-emerald-400/10 transition-colors"
                          title="Edit"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          onClick={() => handleSend(c.id)}
                          className="p-2 text-emerald-400 hover:bg-emerald-400/10 transition-colors"
                          title="Send Now"
                        >
                          <Send size={14} />
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => handleDelete(c.id)}
                      className="p-2 text-red-400 hover:bg-red-400/10 transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default CampaignsPage
