import React, { useState } from 'react'
import { cn } from '../../lib/utils'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import { ShieldAlert, ShieldCheck, Loader2 } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'

interface SettingsSecurityProps {
 settings: {
 jwtExpiresIn: string
 passwordMinLength: number
 allowRegistration: boolean
 }
 setSettings: (s: any) => void
 theme: 'light' | 'dark'
}

const SettingsSecurity: React.FC<SettingsSecurityProps> = ({ settings, setSettings, theme }) => {
 const { user, checkAuth } = useAuthStore()
 const [setupState, setSetupState] = useState<'idle' | 'loading' | 'qrcode'>('idle')
 const [qrCode, setQrCode] = useState<string | null>(null)
 const [token, setToken] = useState('')
 const [verifying, setVerifying] = useState(false)
 const [enabled, setEnabled] = useState(user?.twoFactorEnabled || false)

 const handleSetup = async () => {
 setSetupState('loading')
 try {
 const res = await api.post('/auth/2fa/setup')
 setQrCode(res.data.data.qrCodeImage)
 setSetupState('qrcode')
 } catch {
 toast.error('Failed to initiate 2FA setup')
 setSetupState('idle')
 }
 }

 const handleVerify = async () => {
 if (!token) return toast.error('Enter the 6-digit code')
 setVerifying(true)
 try {
 await api.post('/auth/2fa/verify-setup', { token })
 toast.success('2FA successfully enabled')
 setEnabled(true)
 setSetupState('idle')
 } catch {
 toast.error('Invalid token')
 } finally {
 setVerifying(false)
 }
 }

 return (
 <>
 <div
 className={cn(
 'p-5 rounded-none border flex items-center justify-between transition-all group col-span-1 md:col-span-2',
 theme === 'dark'
 ? 'bg-white/[0.02] border-white/[0.08] hover:border-emerald-500/20'
 : 'bg-gray-50/50 border-gray-200 shadow-sm hover:border-emerald-500/30'
 )}
 >
 <div className="flex flex-col">
 <span className="text-sm font-semibold">
 Open Registration
 </span>
 <span className="text-xs text-gray-500 mt-1">
 Allow anyone to sign up. When disabled, users must be explicitly invited by an admin.
 </span>
 </div>
 <label className="relative inline-flex items-center cursor-pointer">
 <input
 type="checkbox"
 checked={settings.allowRegistration}
 onChange={(e) => setSettings({ ...settings, allowRegistration: e.target.checked })}
 className="sr-only peer"
 />
 <div className="w-11 h-6 bg-gray-500/20 rounded-none peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-none after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500 border border-white/[0.08] shadow-inner"></div>
 </label>
 </div>

 <div
 className={cn(
 'p-5 rounded-none border transition-all space-y-3',
 theme === 'dark' ? 'bg-white/[0.02] border-white/[0.08] hover:border-emerald-500/20' : 'bg-gray-50/50 border-gray-200 shadow-sm hover:border-emerald-500/30'
 )}
 >
 <label className="text-xs font-semibold text-gray-400 px-1">
 Token Lifetime
 </label>
 <input
 type="text"
 value={settings.jwtExpiresIn}
 onChange={(e) => setSettings({ ...settings, jwtExpiresIn: e.target.value })}
 className={cn(
 'w-full border rounded-none py-2.5 px-4 text-sm font-medium transition-all outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-black',
 theme === 'dark'
 ? 'bg-[#0f141f] border-white/[0.08] text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50'
 : 'bg-white border-gray-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50'
 )}
 />
 <p className="text-[10px] text-gray-500 px-1 mt-2">
 Format: '7d', '24h', '30m'
 </p>
 </div>
 
 <div
 className={cn(
 'p-5 rounded-none border transition-all space-y-3',
 theme === 'dark' ? 'bg-white/[0.02] border-white/[0.08] hover:border-emerald-500/20' : 'bg-gray-50/50 border-gray-200 shadow-sm hover:border-emerald-500/30'
 )}
 >
 <label className="text-xs font-semibold text-gray-400 px-1">
 Min Password Length
 </label>
 <input
 type="number"
 value={settings.passwordMinLength}
 onChange={(e) => setSettings({ ...settings, passwordMinLength: Number(e.target.value) })}
 className={cn(
 'w-full border rounded-none py-2.5 px-4 text-sm font-medium transition-all outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-black',
 theme === 'dark'
 ? 'bg-[#0f141f] border-white/[0.08] text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50'
 : 'bg-white border-gray-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50'
 )}
 />
 </div>

 <div
 className={cn(
 'col-span-1 md:col-span-2 p-6 rounded-none border transition-all space-y-6',
 theme === 'dark' ? 'bg-white/[0.02] border-white/[0.08]' : 'bg-gray-50/50 border-gray-200 shadow-sm'
 )}
 >
 <div className="flex items-center gap-4 border-b border-gray-200 dark:border-white/[0.08] pb-5">
 <div className="p-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-500 rounded-none">
 {enabled ? <ShieldCheck size={24} /> : <ShieldAlert size={24} />}
 </div>
 <div>
 <h3 className="text-sm font-semibold">Two-Factor Authentication (2FA)</h3>
 <p className="text-xs text-gray-500 mt-1">Enhance account security with an authenticator app.</p>
 </div>
 </div>

 {enabled ? (
 <div className="text-sm font-semibold text-emerald-600 dark:text-emerald-500 flex items-center gap-2">
 <ShieldCheck size={18} /> 2FA is Active
 </div>
 ) : setupState === 'idle' ? (
 <button
 onClick={handleSetup}
 className="px-6 py-2.5 bg-emerald-600 dark:bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-none transition-colors flex items-center gap-2"
 >
 Configure 2FA
 </button>
 ) : setupState === 'loading' ? (
 <Loader2 className="animate-spin text-emerald-600 dark:text-emerald-500" size={24} />
 ) : (
 <div className="space-y-4">
 <p className="text-xs font-medium text-gray-400">1. Scan the QR code with your authenticator app.</p>
 {qrCode && <img src={qrCode} alt="2FA QR Code" className="w-48 h-48 border-4 border-white rounded-none" />}
 <p className="text-xs font-medium text-gray-400">2. Enter the 6-digit code below to verify.</p>
 <div className="flex gap-3">
 <input
 type="text"
 placeholder="000000"
 maxLength={6}
 value={token}
 onChange={(e) => setToken(e.target.value.replace(/\D/g, ''))}
 className={cn(
 'w-48 border rounded-none py-3 px-4 text-center text-xl font-mono transition-all outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-black tracking-widest',
 theme === 'dark'
 ? 'bg-[#0f141f] border-white/[0.08] text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50'
 : 'bg-white border-gray-300 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50'
 )}
 />
 <button
 onClick={handleVerify}
 disabled={token.length !== 6 || verifying}
 className="px-6 py-3 bg-emerald-600 dark:bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold rounded-none transition-colors flex items-center gap-2"
 >
 {verifying ? <Loader2 size={14} className="animate-spin" /> : 'Verify & Enable'}
 </button>
 </div>
 </div>
 )}
 </div>
 </>
 )
}

export default SettingsSecurity
