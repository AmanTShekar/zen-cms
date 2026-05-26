import React, { useState } from 'react'
import { X, Users, Loader2 } from 'lucide-react'
import { cn } from '../../lib/utils'
import api from '../../lib/api'
import toast from 'react-hot-toast'

interface InviteUserModalProps {
  onClose: () => void
  onInvited: () => void
  theme: 'light' | 'dark'
}

const InviteUserModal: React.FC<InviteUserModalProps> = ({ onClose, onInvited, theme }) => {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'admin' | 'editor' | 'viewer'>('editor')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return

    setLoading(true)
    try {
      await api.post('/system/members', { email: email.trim(), role })
      toast.success(`Invitation sent to ${email}`)
      setSent(true)
      onInvited()
      setTimeout(onClose, 1200)
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to send invitation')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div
        className={cn(
          'w-full max-w-md border rounded-none shadow-2xl',
          theme === 'dark'
            ? 'bg-[#080808] border-white/10'
            : 'bg-white border-gray-100 shadow-black/10'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-none bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <Users size={18} className="text-indigo-500" />
            </div>
            <span className="text-[12px] font-black uppercase italic tracking-wide">
              Initialize Operator
            </span>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        {sent ? (
          <div className="px-8 py-12 text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-none bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <Users size={28} className="text-emerald-500" />
            </div>
            <p className="text-[11px] font-black uppercase italic tracking-widest text-emerald-500">
              Invitation Dispatched
            </p>
            <p className="text-[9px] text-gray-500 uppercase tracking-widest">
              {email} — check inbox for password reset link
            </p>
          </div>
        ) : (
          <form onSubmit={handleInvite} className="px-8 py-6 space-y-6">
            {/* Email */}
            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase italic tracking-[0.3em] text-gray-500">
                Operator Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                placeholder="operator@example.com"
                className={cn(
                  'w-full border rounded-none py-4 px-5 text-[13px] font-black italic transition-all outline-none',
                  theme === 'dark'
                    ? 'bg-white/5 border-white/10 text-white focus:border-indigo-500/50'
                    : 'bg-gray-50 border-gray-200 focus:border-indigo-500'
                )}
              />
            </div>

            {/* Role */}
            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase italic tracking-[0.3em] text-gray-500">
                Auth Tier
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['admin', 'editor', 'viewer'] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className={cn(
                      'py-3 text-[9px] font-black uppercase italic tracking-wider border rounded-none transition-all',
                      role === r
                        ? 'border-indigo-500/40 bg-indigo-500/10 text-indigo-400'
                        : theme === 'dark'
                        ? 'border-white/10 text-gray-500 hover:border-white/20'
                        : 'border-gray-200 text-gray-400 hover:border-gray-300'
                    )}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !email.trim()}
              className={cn(
                'w-full py-4 rounded-none text-[10px] font-black uppercase italic tracking-widest shadow-lg transition-all active:scale-95 disabled:opacity-40',
                theme === 'dark'
                  ? 'bg-indigo-500 hover:bg-indigo-600 text-white'
                  : 'bg-gray-900 hover:bg-gray-800 text-white'
              )}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 size={14} className="animate-spin" />
                  Dispatching Invite...
                </span>
              ) : (
                'Dispatch Invitation'
              )}
            </button>
          </form>
        )}

        <div className="px-8 pb-6">
          <p className="text-[8px] text-gray-600 uppercase tracking-widest text-center italic">
            48h expiring token · sent via SMTP relay · password set on first login
          </p>
        </div>
      </div>
    </div>
  )
}

export default InviteUserModal