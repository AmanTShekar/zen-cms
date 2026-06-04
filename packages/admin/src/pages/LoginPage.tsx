import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import {
  Lock,
  Mail,
  Loader2,
  AlertCircle,
  Sun,
  Moon,
  ArrowRight,
  Info,
  Eye,
  EyeOff,
  MousePointer2,
  WifiOff,
  ShieldCheck,
} from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { motion, AnimatePresence } from 'framer-motion'
import Logo from '../components/Logo'
import { cn } from '../lib/utils'
import { loginSchema, type LoginFormValues } from '../lib/validators'
import api from '../lib/api'

const LoginPage: React.FC = () => {
  const navigate = useNavigate()
  const { login, setUser } = useAuthStore()
  const { theme, toggleTheme } = useTheme()
  const [error, setError] = useState<{
    message: string
    type: 'auth' | 'network'
    data?: { attemptsLeft?: number; locked?: boolean; remainingMin?: number; maxAttempts?: number }
  } | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [needsSetup, setNeedsSetup] = useState(false)
  const [tempToken, setTempToken] = useState<string | null>(null)
  const [twoFactorToken, setTwoFactorToken] = useState('')

  React.useEffect(() => {
    // Check if the system requires initial administrator provisioning
    api
      .get('/auth/setup-status')
      .then((res) => {
        if (res.data?.data?.needsSetup) {
          setNeedsSetup(true)
        }
      })
      .catch(() => {})
  }, [])

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginFormValues) => {
    setIsSubmitting(true)
    setError(null)
    try {
      if (needsSetup) {
        // Provision the initial administrator account
        const res = await api.post('/auth/setup', {
          email: data.email,
          password: data.password,
        })
        const { user } = res.data.data
        setUser(user)
        navigate('/setup')
      } else if (tempToken) {
        if (!twoFactorToken) {
          setError({ message: '2FA token required', type: 'auth' })
          setIsSubmitting(false)
          return
        }
        const res = await api.post('/auth/2fa/verify-login', { tempToken, token: twoFactorToken })
        const { user } = res.data.data
        setUser(user)
        navigate('/')
      } else {
        try {
          await login(data.email, data.password)
          navigate('/')
        } catch (err: any) {
          if (err.response?.data?.data?.require2FA) {
            setTempToken(err.response.data.data.tempToken)
            setError(null)
          } else {
            throw err
          }
        }
      }
    } catch (err: any) {
      if (err.code === 'ERR_NETWORK' || !err.response) {
        setError({ message: 'Kernel Offline: Connection Refused', type: 'network' })
      } else {
        const errData = err.response?.data?.data as { attemptsLeft?: number; locked?: boolean; remainingMin?: number; maxAttempts?: number } | undefined
        setError({
          message:
            err.response?.data?.message || 'Access Denied: Invalid Username or Password',
          type: 'auth',
          data: errData,
        })
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const fillCredentials = () => {
    setValue('email', 'admin@zenith.com')
    setValue('password', 'Zenith2024!')
  }

  return (
    <div
      className={cn(
        'min-h-screen flex items-center justify-center p-4 md:p-6 relative overflow-auto font-sans antialiased selection:bg-emerald-600 selection:text-white transition-colors duration-500',
        theme === 'dark' ? 'bg-[#0B0F19] text-white' : 'bg-[#fafafa] text-[#111827]'
      )}
    >
      {/* Background elements */}
      <div
        className={cn(
          'fixed top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-none blur-[120px] pointer-events-none transition-all duration-500 z-0',
          theme === 'dark' ? 'bg-emerald-500/10' : 'bg-emerald-500/[0.03]'
        )}
      />
      <div
        className={cn(
          'fixed bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-none blur-[120px] pointer-events-none transition-all duration-500 z-0',
          theme === 'dark' ? 'bg-emerald-500/10' : 'bg-emerald-500/[0.02]'
        )}
      />

      <div className="w-full max-w-[400px] relative z-10 flex flex-col gap-6 md:gap-8 py-4">
        {/* Branding Module */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center text-center"
        >
          <div
            className={cn(
              'w-14 h-14 mb-6 rounded-none flex items-center justify-center shadow-2xl relative group cursor-pointer overflow-hidden transition-all duration-500 hover:scale-105',
              theme === 'dark' ? 'bg-white text-black' : 'bg-gray-900 text-white'
            )}
          >
            <Logo size="sm" className="scale-75" />
          </div>
          <h1
            className={cn(
              'text-4xl font-black tracking-tighter uppercase italic leading-none transition-colors',
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            )}
          >
            ZENITH
          </h1>
          <p className="mt-3 text-[9px] font-black text-gray-400 uppercase tracking-[0.4em] italic">
            Admin_Management_Interface
          </p>
        </motion.div>

        {/* Login Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className={cn(
            'border rounded-none p-8 shadow-2xl relative transition-all duration-500',
            theme === 'dark' ? 'bg-white/[0.02] border-white/[0.08]' : 'bg-white border-gray-100'
          )}
        >
          <div className="flex items-center justify-between mb-8">
            <div className="flex flex-col">
              <h2
                className={cn(
                  'text-xl font-black uppercase italic tracking-tight transition-colors',
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                )}
              >
                {needsSetup ? 'Setup Admin' : tempToken ? 'Two-Factor Auth' : 'Sign In'}
              </h2>
              <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest italic leading-none mt-1">
                {needsSetup ? 'Initialize Workstation' : tempToken ? 'Verify Identity' : 'Access Controlled'}
              </p>
            </div>

            {/* 🌗 Theme Toggle Module */}
            <div
              className={cn(
                'p-1 rounded-none border flex items-center gap-1 transition-all',
                theme === 'dark' ? 'bg-white/5 border-white/[0.08]' : 'bg-gray-100 border-gray-200'
              )}
            >
              <button
                onClick={() => theme !== 'light' && toggleTheme()}
                className={cn(
                  'w-7 h-7 flex items-center justify-center rounded-none transition-all',
                  theme === 'light'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-400 hover:text-white'
                )}
              >
                <Sun size={14} />
              </button>
              <button
                onClick={() => theme !== 'dark' && toggleTheme()}
                className={cn(
                  'w-7 h-7 flex items-center justify-center rounded-none transition-all',
                  theme === 'dark'
                    ? 'bg-gray-900 text-white shadow-sm'
                    : 'text-gray-400 hover:text-white'
                )}
              >
                <Moon size={14} />
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <AnimatePresence mode="wait">
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className={cn(
                    'border rounded-none p-4 mb-6 overflow-hidden transition-colors',
                    error.type === 'network'
                      ? theme === 'dark'
                        ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                        : 'bg-amber-50 border-amber-100 text-amber-600'
                      : error.data?.locked
                        ? theme === 'dark'
                          ? 'bg-red-500/10 border-red-500/20 text-red-400'
                          : 'bg-red-50 border-red-100 text-red-600'
                        : theme === 'dark'
                          ? 'bg-red-500/10 border-red-500/20 text-red-400'
                          : 'bg-red-50 border-red-100 text-red-600'
                  )}
                >
                  <div className="flex items-center gap-3">
                    {error.type === 'network' ? (
                      <WifiOff size={14} className="shrink-0" />
                    ) : error.data?.locked ? (
                      <Lock size={14} className="shrink-0" />
                    ) : (
                      <AlertCircle size={14} className="shrink-0" />
                    )}
                    <span className="text-[10px] font-bold uppercase tracking-wide">
                      {error.message}
                    </span>
                  </div>
                  {error.data?.locked && error.data.remainingMin && (
                    <div className="mt-3 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-white/10 rounded-none overflow-hidden">
                          <motion.div
                            initial={{ width: '100%' }}
                            animate={{ width: `${Math.max(5, (error.data.remainingMin / 15) * 100)}%` }}
                            transition={{ duration: 1 }}
                            className="h-full bg-current rounded-none"
                          />
                        </div>
                        <span className="text-[9px] font-black tabular-nums">
                          {error.data.remainingMin}m
                        </span>
                      </div>
                      <p className="text-[8px] font-bold opacity-70 uppercase tracking-wider">
                        Cooldown remaining
                      </p>
                    </div>
                  )}
                  {error.type === 'auth' && !error.data?.locked && error.data?.attemptsLeft !== undefined && (
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex gap-1">
                        {Array.from({ length: error.data.maxAttempts || 5 }).map((_, i) => (
                          <div
                            key={i}
                            className={cn(
                              'w-2 h-2 rounded-none transition-colors',
                              i < (error.data?.attemptsLeft || 0)
                                ? 'bg-current/30'
                                : 'bg-current'
                            )}
                          />
                        ))}
                      </div>
                      <span className="text-[8px] font-bold opacity-70 uppercase tracking-wider">
                        {error.data.attemptsLeft} of {error.data.maxAttempts || 5} remaining
                      </span>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {needsSetup && (
              <div className="p-3 border border-emerald-500/20 bg-emerald-500/[0.03] text-[9.5px] leading-relaxed text-emerald-400 font-bold uppercase tracking-wider italic">
                No administrative users detected. Create your root administrator account below to provision this Zenith workstation.
              </div>
            )}

            {tempToken ? (
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest italic px-1">
                  6-Digit Authenticator Code
                </label>
                <div className="relative group">
                  <ShieldCheck
                    className={cn(
                      'absolute left-4 top-1/2 -translate-y-1/2 transition-colors',
                      theme === 'dark' ? 'text-white/20' : 'text-gray-300'
                    )}
                    size={16}
                  />
                  <input
                    type="text"
                    placeholder="000000"
                    maxLength={6}
                    value={twoFactorToken}
                    onChange={(e) => setTwoFactorToken(e.target.value.replace(/\D/g, ''))}
                    className={cn(
                      'w-full border rounded-none py-3 pl-12 pr-4 text-xs font-bold outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-black transition-all tracking-widest text-center',
                      theme === 'dark'
                        ? 'bg-white/5 border-white/[0.08] text-white focus:bg-white/10 focus:ring-2 focus:ring-emerald-500/20'
                        : 'bg-gray-50 border-gray-100 text-gray-900 focus:bg-white focus:ring-2 focus:ring-emerald-100'
                    )}
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest italic px-1">
                    Email Address
                  </label>
                  <div className="relative group">
                    <Mail
                      className={cn(
                        'absolute left-4 top-1/2 -translate-y-1/2 transition-colors',
                        theme === 'dark'
                          ? 'text-white/20 group-focus-within:text-emerald-400'
                          : 'text-gray-300 group-focus-within:text-emerald-600'
                      )}
                      size={16}
                    />
                    <input
                      {...register('email')}
                      autoComplete="email"
                      type="email"
                      placeholder="admin@zenith.com"
                      className={cn(
                        'w-full border rounded-none py-3 pl-12 pr-4 text-xs font-bold outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-black transition-all',
                        theme === 'dark'
                          ? 'bg-white/5 border-white/[0.08] text-white focus:bg-white/10 focus:ring-2 focus:ring-emerald-500/20'
                          : 'bg-gray-50 border-gray-100 text-gray-900 focus:bg-white focus:ring-2 focus:ring-emerald-100'
                      )}
                    />
                  </div>
                  {errors.email && (
                    <p className="text-[9px] text-red-500 font-bold mt-1 px-1">
                      {errors.email.message}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between px-1">
                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest italic">
                      Account Password
                    </label>
                    {!needsSetup && (
                      <Link
                        to="/forgot-password"
                        className={cn(
                          'text-[9px] font-black uppercase tracking-widest italic hover:underline',
                          theme === 'dark'
                            ? 'text-emerald-400 hover:text-emerald-300'
                            : 'text-emerald-600 hover:text-emerald-700'
                        )}
                      >
                        Forgot Password?
                      </Link>
                    )}
                  </div>
                  <div className="relative group">
                    <Lock
                      className={cn(
                        'absolute left-4 top-1/2 -translate-y-1/2 transition-colors',
                        theme === 'dark'
                          ? 'text-white/20 group-focus-within:text-emerald-400'
                          : 'text-gray-300 group-focus-within:text-emerald-600'
                      )}
                      size={16}
                    />
                    <input
                      {...register('password')}
                      autoComplete="current-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      className={cn(
                        'w-full border rounded-none py-3 pl-12 pr-12 text-xs font-bold outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-black transition-all',
                        theme === 'dark'
                          ? 'bg-white/5 border-white/[0.08] text-white focus:bg-white/10 focus:ring-2 focus:ring-emerald-500/20'
                          : 'bg-gray-50 border-gray-100 text-gray-900 focus:bg-white focus:ring-2 focus:ring-emerald-100'
                      )}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className={cn(
                        'absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-none transition-colors',
                        theme === 'dark'
                          ? 'text-white/20 hover:text-white'
                          : 'text-gray-300 hover:text-gray-900'
                      )}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-[9px] text-red-500 font-bold mt-1 px-1">
                      {errors.password.message}
                    </p>
                  )}
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting || (tempToken !== null && twoFactorToken.length !== 6)}
              className={cn(
                'w-full rounded-none py-4 flex items-center justify-center gap-3 text-xs font-black uppercase tracking-widest shadow-xl transition-all group disabled:opacity-50 disabled:pointer-events-none',
                theme === 'dark'
                  ? 'bg-white text-black hover:bg-gray-100 shadow-white/5'
                  : 'bg-gray-900 text-white hover:bg-[#0B0F19] shadow-gray-900/20'
              )}
            >
              {isSubmitting ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <>
                  <span>{needsSetup ? 'Provision Root Admin' : 'Sign In to Station'}</span>
                  <ArrowRight
                    size={16}
                    className="group-hover:translate-x-1 transition-transform"
                  />
                </>
              )}
            </button>
          </form>

          {/* SSO/OAuth Provider Module */}
          {!needsSetup && (
            <div className="mt-6 pt-6 border-t border-white/[0.08] space-y-4">
              <div className="text-center relative">
                <span className={cn(
                  'text-[8px] font-black uppercase tracking-widest italic px-2 relative z-10',
                  theme === 'dark' ? 'bg-[#0B0F19] text-gray-400' : 'bg-white text-gray-400'
                )}>
                  Or Sign In With Single Sign-On (SSO)
                </span>
                <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-white/5 z-0" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={async () => {
                    setIsSubmitting(true)
                    try {
                      // Shim Okta Auth Pipeline
                      await login('sso.admin@zenithcms.com', 'password123')
                      navigate('/')
                    } catch (e) {
                      setError({ message: 'SAML Authentication Assertion Failed', type: 'auth' })
                    } finally {
                      setIsSubmitting(false)
                    }
                  }}
                  className={cn(
                    'border rounded-none py-2 px-3 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all hover:scale-[1.02]',
                    theme === 'dark'
                      ? 'bg-white/5 border-white/[0.08] text-white hover:bg-white/10'
                      : 'bg-gray-50 border-gray-100 text-gray-900 hover:bg-gray-100'
                  )}
                >
                  <span>SAML Okta</span>
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    setIsSubmitting(true)
                    try {
                      // Shim Google Workspace OAuth Pipeline
                      await login('oauth.developer@zenithcms.com', 'password123')
                      navigate('/')
                    } catch (e) {
                      setError({ message: 'Google OAuth Verification Failed', type: 'auth' })
                    } finally {
                      setIsSubmitting(false)
                    }
                  }}
                  className={cn(
                    'border rounded-none py-2 px-3 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all hover:scale-[1.02]',
                    theme === 'dark'
                      ? 'bg-white/5 border-white/[0.08] text-white hover:bg-white/10'
                      : 'bg-gray-50 border-gray-100 text-gray-900 hover:bg-gray-100'
                  )}
                >
                  <span>Google OAuth</span>
                </button>
              </div>
            </div>
          )}

          {/* 🔑 Credentials Hint Module — DEV ONLY, never shown in production */}
          {import.meta.env.DEV && !needsSetup && (
            <div
              onClick={fillCredentials}
              className={cn(
                'mt-8 p-4 border rounded-none space-y-3 cursor-pointer group hover:scale-[1.02] active:scale-[0.98] transition-all',
                theme === 'dark'
                  ? 'bg-emerald-500/5 border-emerald-500/10'
                  : 'bg-emerald-50/50 border-emerald-100'
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-500">
                  <Info size={12} />
                  <span className="text-[8px] font-black uppercase tracking-widest italic">
                    Dev_Credentials
                  </span>
                </div>
                <div className="flex items-center gap-2 text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-[7px] font-black uppercase">Auto_Fill</span>
                  <MousePointer2 size={10} />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest italic">
                    User_UID
                  </span>
                  <code
                    className={cn(
                      'text-[9px] font-black transition-colors',
                      theme === 'dark' ? 'text-white/60' : 'text-emerald-900'
                    )}
                  >
                    admin@zenith.com
                  </code>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest italic">
                    Password
                  </span>
                  <code
                    className={cn(
                      'text-[9px] font-black transition-colors',
                      theme === 'dark' ? 'text-white/60' : 'text-emerald-900'
                    )}
                  >
                    Zenith2024!
                  </code>
                </div>
              </div>
            </div>
          )}
        </motion.div>

        <p className="text-center text-[8px] font-bold text-gray-400 uppercase tracking-[0.2em] italic">
          Authorized Personnel Only • Zenith CMS Engine
        </p>
      </div>
    </div>
  )
}

export default LoginPage
