import React, { useState } from 'react'
import {
  Key, Shield, Loader2, Copy, Check, Clock, Calendar,
  Plus, Trash2, Eye, EyeOff, AlertTriangle, ExternalLink,
  Activity, Globe, ChevronRight, Info
} from 'lucide-react'
import { cn } from '../../lib/utils'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import EmptyState from '../../components/EmptyState'
import GenerateKeyModal from './GenerateKeyModal'
import ApiIntegrationGuide from './ApiIntegrationGuide'

interface ApiKey {
  _id: string
  name: string
  role: string
  expiresAt: string | number | Date
  createdAt?: string
  lastUsed?: string
  usageCount?: number
  permissions?: Array<{ resource: string; actions: string[] }>
  [key: string]: any
}

interface SettingsApiKeysProps {
  apiKeys: ApiKey[]
  theme: 'light' | 'dark'
  fetchData: () => void
  setNewKey: (k: any) => void
}

function getDaysUntilExpiry(expiresAt: string | number | Date): number | null {
  if (!expiresAt) return null
  const exp = new Date(expiresAt).getTime()
  const now = Date.now()
  return Math.ceil((exp - now) / (1000 * 60 * 60 * 24))
}

function ExpiryBadge({ expiresAt, dark }: { expiresAt: string | number | Date; dark: boolean }) {
  const days = getDaysUntilExpiry(expiresAt)
  if (days === null) return null
  if (days < 0) return (
    <span className="text-sm font-semibold px-2 py-0.5 border border-red-500/30 bg-red-500/10 text-red-400 flex items-center gap-1">
      <AlertTriangle size={8} /> Expired
    </span>
  )
  if (days <= 7) return (
    <span className="text-sm font-semibold px-2 py-0.5 border border-amber-500/30 bg-amber-500/10 text-amber-400">
      {days}d left
    </span>
  )
  if (days <= 30) return (
    <span className="text-sm font-semibold px-2 py-0.5 border border-yellow-500/30 bg-yellow-500/10 text-yellow-400">
      {days}d
    </span>
  )
  return (
    <span className="text-sm font-semibold px-2 py-0.5 border border-z-active-border bg-z-active-bg text-z-active-text">
      {days}d
    </span>
  )
}

const ROLE_COLORS: Record<string, string> = {
  admin: 'text-red-400 border-red-500/30 bg-red-500/10',
  editor: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
  viewer: 'text-z-active-text border-z-active-border bg-z-active-bg',
}

const SettingsApiKeys: React.FC<SettingsApiKeysProps> = ({ apiKeys, theme, fetchData, setNewKey }) => {
  const dark = theme === 'dark'
  const [generateOpen, setGenerateOpen] = useState(false)
  const [revokingId, setRevokingId] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const handleRevokeKey = async (id: string) => {
    setRevokingId(id)
    try {
      await api.post(`/system/api-keys/${id}/revoke`)
      toast.success('Token revoked')
      fetchData()
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to revoke token')
    } finally {
      setRevokingId(null)
    }
  }

  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
    toast.success('Key ID copied')
  }

  const card = cn(
    'border rounded-none transition-all shadow-sm group',
    dark ? 'bg-z-panel backdrop-blur-md border-z-border hover:border-z-active-border' : 'bg-z-input border-z-border shadow-sm hover:border-z-active-border'
  )

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-3">
            <span className={cn('text-sm font-semibold  ', dark ? 'text-z-secondary' : 'text-z-secondary')}>
              {apiKeys.length} Active {apiKeys.length === 1 ? 'Credential' : 'Credentials'}
            </span>
            {apiKeys.some(k => getDaysUntilExpiry(k.expiresAt) !== null && getDaysUntilExpiry(k.expiresAt)! <= 7) && (
              <span className="flex items-center gap-1 text-sm text-amber-400 font-semibold">
                <AlertTriangle size={10} /> Expiring Soon
              </span>
            )}
          </div>
          <button
            onClick={() => setGenerateOpen(true)}
            className={cn('flex items-center gap-2 text-sm font-semibold  border px-5 py-2.5 transition-all', dark ? 'border-z-active-border text-z-active-text hover:bg-z-active-bg hover:border-z-accent' : 'border-z-active-border text-z-accent hover:bg-z-active-bg')}
          >
            <Plus size={13} />
            Generate Token
          </button>
        </div>

        {/* Key Cards */}
        {apiKeys.length === 0 ? (
          <div className={cn('py-10 border border-dashed', dark ? 'border-z-border' : 'border-z-border')}>
            <EmptyState
              icon={Key}
              title="No API keys"
              message="Generate an API key to authenticate external applications against the Zenith CMS API"
              action={
                <button onClick={() => setGenerateOpen(true)} className={cn('flex items-center gap-2 px-6 py-3 text-sm font-semibold  border transition-all', dark ? 'border-z-active-border text-z-active-text hover:bg-z-active-bg' : 'border-z-active-border text-z-accent hover:bg-z-active-bg')}>
                  <Plus size={12} /> Generate Token
                </button>
              }
            />
          </div>
        ) : (
          <div className="space-y-3">
            {apiKeys.map(key => {
              const isExpanded = expandedId === key._id
              const days = getDaysUntilExpiry(key.expiresAt)
              const roleClass = ROLE_COLORS[key.role] || 'text-z-muted border-white/10 bg-z-hover'
              return (
                <div key={key._id} className={card}>
                  {/* Header */}
                  <div
                    className="flex items-center gap-4 px-5 py-4 cursor-pointer"
                    onClick={() => setExpandedId(isExpanded ? null : key._id)}
                  >
                    <div className={cn('w-12 h-12 flex items-center justify-center border flex-shrink-0', dark ? 'bg-z-active-bg text-z-active-text border-z-active-border' : 'bg-z-active-bg text-z-accent border-z-active-border')}>
                      <Key size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={cn('text-[13px] font-semibold  ', dark ? 'text-white' : 'text-z-primary')}>{key.name}</span>
                        <span className={cn('text-sm font-semibold   px-2 py-0.5 border', roleClass)}>{key.role}</span>
                        <ExpiryBadge expiresAt={key.expiresAt} dark={dark} />
                      </div>
                      <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                        <span className="text-sm text-z-secondary flex items-center gap-1">
                          <Calendar size={9} />
                          Expires {new Date(key.expiresAt).toLocaleDateString()}
                        </span>
                        {key.lastUsed && (
                          <span className="text-sm text-z-secondary flex items-center gap-1">
                            <Activity size={9} />
                            Last used {new Date(key.lastUsed).toLocaleDateString()}
                          </span>
                        )}
                        {key.usageCount !== undefined && (
                          <span className="text-sm text-z-secondary flex items-center gap-1">
                            <Globe size={9} />
                            {key.usageCount} requests
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={e => { e.stopPropagation(); handleCopyId(key._id) }}
                        className={cn('p-2.5 transition-colors', dark ? 'text-z-secondary hover:text-z-active-text' : 'text-z-muted hover:text-z-accent')}
                        title="Copy key ID"
                      >
                        {copiedId === key._id ? <Check size={15} className="text-z-active-text" /> : <Copy size={15} />}
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); handleRevokeKey(key._id) }}
                        disabled={revokingId === key._id}
                        className={cn('p-2.5 transition-colors disabled:opacity-30', dark ? 'text-z-secondary hover:text-red-400' : 'text-z-muted hover:text-red-600')}
                        title="Revoke token"
                      >
                        {revokingId === key._id ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                      </button>
                      <ChevronRight size={14} className={cn('text-z-secondary transition-transform', isExpanded && 'rotate-90')} />
                    </div>
                  </div>

                  {/* Expanded Detail */}
                  {isExpanded && (
                    <div className="px-5 pb-5 pt-3 border-t space-y-4" style={{ borderColor: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }}>
                      {/* Key ID */}
                      <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-z-secondary">Key ID (prefix)</label>
                        <div className="flex items-center gap-2">
                          <code className={cn('flex-1 font-mono text-sm px-3 py-2 border truncate', dark ? 'bg-black/80 border-z-border text-z-active-text' : 'bg-z-panel border-z-border text-gray-700')}>
                            {key._id}
                          </code>
                          <button onClick={() => handleCopyId(key._id)} className={cn('p-2 border transition-all', dark ? 'border-white/10 text-z-secondary hover:text-white' : 'border-z-border text-z-secondary')}>
                            {copiedId === key._id ? <Check size={13} className="text-z-active-text" /> : <Copy size={13} />}
                          </button>
                        </div>
                      </div>

                      {/* Permissions */}
                      {key.permissions && key.permissions.length > 0 && (
                        <div className="space-y-1.5">
                          <label className="text-sm font-semibold text-z-secondary">Granted Permissions</label>
                          <div className="flex flex-wrap gap-1.5">
                            {key.permissions.map((perm: any, i: number) => (
                              <span key={i} className={cn('text-sm font-semibold   px-2 py-1 border', dark ? 'bg-z-hover border-white/10 text-z-muted' : 'bg-z-input border-z-border text-z-secondary')}>
                                {perm.resource}: {perm.actions.join(', ')}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Usage example */}
                      <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-z-secondary">Usage Example</label>
                        <pre className={cn('text-sm font-mono p-3 border overflow-x-auto', dark ? 'bg-black/80 border-z-border text-gray-300' : 'bg-z-input border-z-border text-gray-700')}>
{`curl https://api.example.com/api/v1/posts \\
  -H "Authorization: Bearer YOUR_KEY"`}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        <ApiIntegrationGuide theme={theme} apiKeys={apiKeys} />
      </div>

      {generateOpen && (
        <GenerateKeyModal
          onClose={() => setGenerateOpen(false)}
          onGenerated={keyData => {
            setNewKey(keyData)
            fetchData()
          }}
          onOpenKeyModal={setNewKey}
          theme={theme}
        />
      )}
    </>
  )
}

export default SettingsApiKeys
