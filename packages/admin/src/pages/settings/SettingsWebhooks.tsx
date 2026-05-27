import React, { useState, useEffect, useRef } from 'react'
import { Webhook, Plus, Trash2, Send, CheckCircle2, XCircle, Loader2, Bell, BellOff, Clock, ChevronDown, ChevronUp, RotateCcw } from 'lucide-react'
import { cn } from '../../lib/utils'
import { confirm } from '../../store/confirmStore'
import api from '../../lib/api'
import toast from 'react-hot-toast'

interface WebhookTarget {
  id: string
  url: string
  secret: string
  events: string[]
  enabled: boolean
  createdAt: string
}

interface DeliveryRecord {
  id: string
  collectionSlug?: string
  event: string
  url: string
  success: boolean
  responseStatus?: number
  timestamp: string
}

interface SettingsWebhooksProps {
  theme: 'light' | 'dark'
}

const AVAILABLE_EVENTS = [
  { value: 'posts.created', label: 'Post Created' },
  { value: 'posts.updated', label: 'Post Updated' },
  { value: 'posts.deleted', label: 'Post Deleted' },
  { value: 'posts.published', label: 'Post Published' },
  { value: 'posts.unpublished', label: 'Post Unpublished' },
  { value: 'authors.created', label: 'Author Created' },
  { value: 'authors.updated', label: 'Author Updated' },
  { value: 'authors.deleted', label: 'Author Deleted' },
  { value: 'products.created', label: 'Product Created' },
  { value: 'products.updated', label: 'Product Updated' },
  { value: 'products.deleted', label: 'Product Deleted' },
  { value: 'media.uploaded', label: 'Media Uploaded' },
  { value: 'media.deleted', label: 'Media Deleted' },
  { value: '*', label: 'All Events' },
]

const SettingsWebhooks: React.FC<SettingsWebhooksProps> = ({ theme }) => {
  const [webhooks, setWebhooks] = useState<WebhookTarget[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formUrl, setFormUrl] = useState('')
  const [formSecret, setFormSecret] = useState('')
  const [formEvents, setFormEvents] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [testingId, setTestingId] = useState<string | null>(null)
  const [expandedWebhook, setExpandedWebhook] = useState<string | null>(null)
  const [deliveries, setDeliveries] = useState<Record<string, DeliveryRecord[]>>({})
  const [loadingDeliveries, setLoadingDeliveries] = useState<string | null>(null)
  const isMountedRef = useRef(true)
  useEffect(() => { return () => { isMountedRef.current = false } }, [])

  const fetchWebhooks = async () => {
    if (!isMountedRef.current) return
    setLoading(true)
    try {
      const res = await api.get('/system/webhooks')
      if (isMountedRef.current) setWebhooks(res.data.data || [])
    } catch {
      if (isMountedRef.current) toast.error('Failed to load webhooks')
    } finally {
      if (isMountedRef.current) setLoading(false)
    }
  }

  React.useEffect(() => { fetchWebhooks() }, [])

  const fetchDeliveries = async (webhookId: string, url: string) => {
    if (!isMountedRef.current) return
    setLoadingDeliveries(webhookId)
    try {
      const res = await api.get(`/system/webhooks/${webhookId}/deliveries?limit=25`)
      if (isMountedRef.current) setDeliveries(prev => ({ ...prev, [url]: res.data.data || [] }))
    } catch {
      if (isMountedRef.current) toast.error('Failed to load delivery log')
    } finally {
      if (isMountedRef.current) setLoadingDeliveries(null)
    }
  }

  const toggleExpand = (wh: WebhookTarget) => {
    if (expandedWebhook === wh.id) {
      setExpandedWebhook(null)
    } else {
      setExpandedWebhook(wh.id)
      if (!deliveries[wh.url]) {
        fetchDeliveries(wh.id, wh.url)
      }
    }
  }

  const resetForm = () => {
    setFormUrl('')
    setFormSecret('')
    setFormEvents([])
    setEditingId(null)
    setShowForm(false)
  }

  const handleEdit = (wh: WebhookTarget) => {
    setEditingId(wh.id)
    setFormUrl(wh.url)
    setFormSecret(wh.secret)
    setFormEvents(wh.events)
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!formUrl.trim()) { toast.error('URL is required'); return }
    if (formEvents.length === 0) { toast.error('Select at least one event'); return }
    setSaving(true)
    try {
      if (editingId) {
        await api.put(`/system/webhooks/${editingId}`, { url: formUrl, secret: formSecret, events: formEvents })
        toast.success('Webhook updated')
      } else {
        await api.post('/system/webhooks', { url: formUrl, secret: formSecret, events: formEvents })
        toast.success('Webhook created')
      }
      resetForm()
      fetchWebhooks()
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save webhook')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!await confirm({ message: 'Delete this webhook?' })) return
    try {
      await api.delete(`/system/webhooks/${id}`)
      toast.success('Webhook deleted')
      fetchWebhooks()
    } catch { toast.error('Failed to delete webhook') }
  }

  const handleToggle = async (wh: WebhookTarget) => {
    try {
      await api.put(`/system/webhooks/${wh.id}`, { enabled: !wh.enabled })
      setWebhooks(prev => prev.map(w => w.id === wh.id ? { ...w, enabled: !w.enabled } : w))
      toast.success(wh.enabled ? 'Webhook disabled' : 'Webhook enabled')
    } catch { toast.error('Failed to toggle webhook') }
  }

  const handleTest = async (id: string, url: string) => {
    setTestingId(id)
    try {
      const res = await api.post(`/system/webhooks/${id}/test`)
      if (res.data.data.success) {
        toast.success(`Test delivered (status ${res.data.data.status})`)
      } else {
        toast.error(`Test failed: ${res.data.data.error || 'Unknown error'}`)
      }
      // Refresh deliveries after test
      fetchDeliveries(id, url)
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Test failed')
    } finally {
      setTestingId(null)
    }
  }

  const handleRetryDelivery = async (whId: string, whUrl: string) => {
    // Re-send a test event to refresh the delivery log
    await handleTest(whId, whUrl)
  }

  const toggleEvent = (value: string) => {
    if (value === '*') {
      setFormEvents(['*'])
      return
    }
    setFormEvents(prev => {
      const next = prev.filter(e => e !== '*')
      if (next.includes(value)) return next.filter(e => e !== value)
      return [...next, value]
    })
  }

  const formatTimestamp = (ts: string) => {
    try {
      const d = new Date(ts)
      return d.toLocaleString('en-US', {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit',
      })
    } catch {
      return ts
    }
  }

  return (
    <div className="col-span-full space-y-6">
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <div className="flex flex-col">
          <h3 className="text-sm font-black uppercase italic tracking-wider flex items-center gap-3">
            <Webhook size={16} className="text-emerald-400" />
            Webhook Management
          </h3>
          <span className="text-[8px] text-gray-500 font-bold uppercase tracking-widest mt-1">
            Configure HTTP callbacks for content lifecycle events
          </span>
        </div>
        {!showForm && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 border border-emerald-500/30 hover:border-emerald-500 hover:bg-emerald-500/10 text-[10px] font-black uppercase italic transition-all text-emerald-400 hover:text-white"
          >
            <Plus size={12} />
            Add Webhook
          </button>
        )}
      </div>

      {/* Form */}
      {showForm && (
        <div className={cn(
          'p-6 border rounded-none space-y-5',
          theme === 'dark' ? 'bg-white/[0.01] border-white/5' : 'bg-gray-50 border-gray-200'
        )}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase italic tracking-widest text-emerald-400">
              {editingId ? 'Edit Webhook' : 'New Webhook'}
            </span>
            <button onClick={resetForm} className="text-gray-500 hover:text-white text-[10px] font-black uppercase">Cancel</button>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Endpoint URL</label>
              <input
                type="url"
                value={formUrl}
                onChange={(e) => setFormUrl(e.target.value)}
                placeholder="https://example.com/api/webhooks/zenith"
                className={cn(
                  'w-full border rounded-none py-3 px-4 text-[12px] font-mono italic transition-all outline-none',
                  theme === 'dark' ? 'bg-black border-white/10 text-white focus:border-emerald-500' : 'bg-white border-gray-200 focus:border-emerald-500'
                )}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Signing Secret (optional)</label>
              <input
                type="password"
                value={formSecret}
                onChange={(e) => setFormSecret(e.target.value)}
                placeholder="whsec_..."
                className={cn(
                  'w-full border rounded-none py-3 px-4 text-[12px] font-mono italic transition-all outline-none',
                  theme === 'dark' ? 'bg-black border-white/10 text-white focus:border-emerald-500' : 'bg-white border-gray-200 focus:border-emerald-500'
                )}
              />
            </div>

            <div className="space-y-2">
              <label className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Subscribed Events</label>
              <div className={cn(
                'p-4 border rounded-none flex flex-wrap gap-2 max-h-40 overflow-y-auto',
                theme === 'dark' ? 'bg-black border-white/5' : 'bg-white border-gray-200'
              )}>
                {AVAILABLE_EVENTS.map((evt) => {
                  const checked = formEvents.includes(evt.value)
                  return (
                    <button
                      key={evt.value}
                      type="button"
                      onClick={() => toggleEvent(evt.value)}
                      className={cn(
                        'px-3 py-1.5 text-[8px] font-black uppercase italic tracking-widest border rounded-none transition-all',
                        checked
                          ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
                          : theme === 'dark' ? 'border-white/10 text-gray-500 hover:text-gray-300' : 'border-gray-200 text-gray-400 hover:text-gray-600'
                      )}
                    >
                      {evt.label}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase italic tracking-wider transition-all disabled:opacity-40"
            >
              {saving ? <Loader2 size={12} className="animate-spin" /> : null}
              {editingId ? 'Update Webhook' : 'Create Webhook'}
            </button>
          </div>
        </div>
      )}

      {/* Webhook list */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={24} className="text-emerald-500 animate-spin" />
        </div>
      ) : webhooks.length === 0 ? (
        <div className={cn(
          'p-12 border border-dashed rounded-none text-center space-y-4',
          theme === 'dark' ? 'border-white/10' : 'border-gray-200'
        )}>
          <Webhook size={40} className="mx-auto text-gray-600" />
          <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
            No webhooks configured
          </p>
          <p className="text-[9px] text-gray-600 uppercase tracking-wider">
            Add a webhook to receive HTTP callbacks when content events occur
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {webhooks.map((wh) => (
            <div key={wh.id} className="space-y-0">
              <div
                className={cn(
                  'p-5 border rounded-none transition-all',
                  wh.enabled
                    ? theme === 'dark' ? 'bg-white/[0.01] border-white/5' : 'bg-white border-gray-100'
                    : theme === 'dark' ? 'bg-white/[0.005] border-white/[0.03] opacity-60' : 'bg-gray-50 border-gray-100 opacity-60'
                )}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    {wh.enabled
                      ? <CheckCircle2 size={14} className="text-emerald-500" />
                      : <XCircle size={14} className="text-gray-600" />
                    }
                    <span className="text-[11px] font-mono font-bold truncate max-w-md">{wh.url}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleTest(wh.id, wh.url)}
                      disabled={testingId === wh.id || !wh.enabled}
                      className={cn(
                        'p-2 border rounded-none transition-colors',
                        theme === 'dark' ? 'border-white/10 text-gray-500 hover:text-emerald-400' : 'border-gray-200 text-gray-400 hover:text-emerald-600'
                      )}
                      title="Send test event"
                    >
                      {testingId === wh.id ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                    </button>
                    <button
                      onClick={() => handleToggle(wh)}
                      className={cn(
                        'p-2 border rounded-none transition-colors',
                        wh.enabled
                          ? theme === 'dark' ? 'border-white/10 text-amber-500 hover:text-amber-400' : 'border-gray-200 text-amber-600'
                          : theme === 'dark' ? 'border-white/10 text-gray-500 hover:text-emerald-400' : 'border-gray-200 text-gray-400 hover:text-emerald-600'
                      )}
                      title={wh.enabled ? 'Disable' : 'Enable'}
                    >
                      {wh.enabled ? <Bell size={12} /> : <BellOff size={12} />}
                    </button>
                    <button
                      onClick={() => handleEdit(wh)}
                      className={cn(
                        'px-3 py-1.5 text-[8px] font-black uppercase italic border rounded-none transition-colors',
                        theme === 'dark' ? 'border-white/10 text-gray-500 hover:text-white' : 'border-gray-200 text-gray-400 hover:text-gray-900'
                      )}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(wh.id)}
                      className={cn(
                        'p-2 border rounded-none transition-colors',
                        theme === 'dark' ? 'border-white/10 text-gray-500 hover:text-red-400' : 'border-gray-200 text-gray-400 hover:text-red-600'
                      )}
                      title="Delete"
                    >
                      <Trash2 size={12} />
                    </button>
                    <button
                      onClick={() => toggleExpand(wh)}
                      className={cn(
                        'p-2 border rounded-none transition-colors',
                        expandedWebhook === wh.id
                          ? 'border-emerald-500/40 text-emerald-400'
                          : theme === 'dark' ? 'border-white/10 text-gray-500 hover:text-emerald-400' : 'border-gray-200 text-gray-400 hover:text-emerald-600'
                      )}
                      title="Delivery log"
                    >
                      {expandedWebhook === wh.id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {wh.events.map((evt) => (
                    <span
                      key={evt}
                      className={cn(
                        'px-2 py-0.5 text-[7px] font-black uppercase tracking-widest border rounded-none',
                        evt === '*'
                          ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/5'
                          : theme === 'dark' ? 'border-white/10 text-gray-500' : 'border-gray-200 text-gray-400'
                      )}
                    >
                      {evt}
                    </span>
                  ))}
                  {wh.secret && (
                    <span className={cn(
                      'px-2 py-0.5 text-[7px] font-black uppercase tracking-widest border rounded-none',
                      theme === 'dark' ? 'border-emerald-500/20 text-emerald-500' : 'border-emerald-200 text-emerald-600'
                    )}>
                      Signed
                    </span>
                  )}
                </div>
              </div>

              {/* Delivery Log Panel */}
              {expandedWebhook === wh.id && (
                <div className={cn(
                  'border border-t-0 rounded-none p-4',
                  theme === 'dark' ? 'bg-black/30 border-white/5' : 'bg-gray-50 border-gray-200'
                )}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Clock size={12} className="text-emerald-400" />
                      <span className="text-[9px] font-black uppercase italic tracking-widest text-emerald-400">
                        Delivery Log
                      </span>
                    </div>
                    <button
                      onClick={() => fetchDeliveries(wh.id, wh.url)}
                      disabled={loadingDeliveries === wh.id}
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-1.5 text-[7px] font-black uppercase italic border rounded-none transition-colors',
                        theme === 'dark' ? 'border-white/10 text-gray-500 hover:text-emerald-400' : 'border-gray-200 text-gray-400 hover:text-emerald-600'
                      )}
                    >
                      {loadingDeliveries === wh.id ? (
                        <Loader2 size={9} className="animate-spin" />
                      ) : (
                        <RotateCcw size={9} />
                      )}
                      Refresh
                    </button>
                  </div>

                  {loadingDeliveries === wh.id ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 size={16} className="text-emerald-500 animate-spin" />
                    </div>
                  ) : !deliveries[wh.url] || deliveries[wh.url].length === 0 ? (
                    <div className={cn(
                      'py-6 text-center border border-dashed rounded-none',
                      theme === 'dark' ? 'border-white/5' : 'border-gray-200'
                    )}>
                      <Clock size={24} className="mx-auto text-gray-600 mb-2" />
                      <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">
                        No deliveries yet
                      </p>
                      <p className="text-[8px] text-gray-600 uppercase tracking-wider mt-1">
                        Send a test event or wait for a content event to trigger this webhook
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-80 overflow-y-auto">
                      {/* Header */}
                      <div className={cn(
                        'grid grid-cols-[1fr_1fr_80px_80px_100px] gap-2 px-3 py-2 text-[7px] font-black uppercase tracking-widest border-b',
                        theme === 'dark' ? 'text-gray-500 border-white/5' : 'text-gray-400 border-gray-200'
                      )}>
                        <span>Event</span>
                        <span>Collection</span>
                        <span>Status</span>
                        <span>Code</span>
                        <span>Time</span>
                      </div>
                      {deliveries[wh.url].map((d) => (
                        <div
                          key={d.id}
                          className={cn(
                            'grid grid-cols-[1fr_1fr_80px_80px_100px] gap-2 px-3 py-2.5 text-[9px] font-mono border rounded-none transition-colors',
                            d.success
                              ? theme === 'dark' ? 'bg-emerald-500/[0.03] border-emerald-500/10' : 'bg-emerald-50 border-emerald-100'
                              : theme === 'dark' ? 'bg-red-500/[0.03] border-red-500/10' : 'bg-red-50 border-red-100'
                          )}
                        >
                          <span className="font-bold truncate">{d.event}</span>
                          <span className={cn(
                            'truncate',
                            theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                          )}>
                            {d.collectionSlug || '—'}
                          </span>
                          <span className="flex items-center gap-1">
                            {d.success ? (
                              <CheckCircle2 size={9} className="text-emerald-500" />
                            ) : (
                              <XCircle size={9} className="text-red-500" />
                            )}
                            <span className={d.success ? 'text-emerald-500' : 'text-red-500'}>
                              {d.success ? 'OK' : 'Failed'}
                            </span>
                          </span>
                          <span className={cn(
                            'font-bold',
                            d.responseStatus && d.responseStatus >= 200 && d.responseStatus < 300
                              ? 'text-emerald-500'
                              : d.responseStatus && d.responseStatus >= 400
                                ? 'text-red-500'
                                : theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                          )}>
                            {d.responseStatus || '—'}
                          </span>
                          <span className={cn(
                            theme === 'dark' ? 'text-gray-600' : 'text-gray-400'
                          )}>
                            {formatTimestamp(d.timestamp)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default SettingsWebhooks
