import React, { useState } from 'react'
import { Key, Shield, Loader2 } from 'lucide-react'
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
  [key: string]: unknown
}

interface SettingsApiKeysProps {
  apiKeys: ApiKey[]
  theme: 'light' | 'dark'
  fetchData: () => void
  setNewKey: (k: any) => void
}

const SettingsApiKeys: React.FC<SettingsApiKeysProps> = ({ apiKeys, theme, fetchData, setNewKey }) => {
  const [generateOpen, setGenerateOpen] = useState(false)
  const [revokingId, setRevokingId] = useState<string | null>(null)

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

  return (
    <>
      <div className="col-span-full space-y-4">
        <div className="flex items-center justify-between mb-4 px-2">
          <span className="text-[10px] font-black uppercase italic tracking-[0.3em] text-emerald-500">
            {apiKeys.length} Active Credentials
          </span>
          <button
            onClick={() => setGenerateOpen(true)}
            className="text-[10px] font-black uppercase italic border border-white/10 px-8 py-3 rounded-none hover:bg-white/5 transition-all"
          >
            Generate Token
          </button>
        </div>
        <div className="grid grid-cols-1 gap-4">
          {apiKeys.length === 0 ? (
            <div className="py-6 border border-dashed rounded-none border-white/5">
              <EmptyState
                icon={Key}
                title="No API keys"
                message="Generate an API key to authenticate external applications"
                action={
                  <button
                    onClick={() => setGenerateOpen(true)}
                    className="text-[10px] font-black uppercase italic border border-white/10 px-8 py-3 rounded-none hover:bg-white/5 transition-all"
                  >
                    Generate Token
                  </button>
                }
              />
            </div>
          ) : (
            apiKeys.map((key) => (
            <div
              key={key._id}
              className={cn(
                'flex items-center justify-between p-6 border rounded-none transition-all group',
                theme === 'dark'
                  ? 'bg-black/40 border-white/5 hover:border-red-500/10'
                  : 'bg-gray-50 border-gray-100'
              )}
            >
              <div className="flex items-center gap-6">
                <div className="w-14 h-14 rounded-none bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/20">
                  <Key size={24} />
                </div>
                <div className="flex flex-col leading-none">
                  <span className="text-[14px] font-black italic uppercase leading-none">
                    {key.name}
                  </span>
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-2.5 opacity-60">
                    Permissions: {key.role} · Registry Node:{' '}
                    {new Date(key.expiresAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <button
                onClick={() => handleRevokeKey(key._id)}
                disabled={revokingId === key._id}
                className="p-4 text-gray-500 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-30"
                title="Revoke token"
              >
                {revokingId === key._id ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Shield size={18} />
                )}
              </button>
            </div>
          )))}
        </div>
      </div>
      
      <ApiIntegrationGuide theme={theme} apiKeys={apiKeys} />

      {generateOpen && (
        <GenerateKeyModal
          onClose={() => setGenerateOpen(false)}
          onGenerated={(keyData) => {
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
