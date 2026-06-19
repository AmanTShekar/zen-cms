import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate, Link } from 'react-router-dom'
import {
 Mail,
 Loader2,
 AlertCircle,
 CheckCircle,
 ArrowRight,
 ArrowLeft,
 Sun,
 Moon,
} from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { motion } from 'framer-motion'
import Logo from '../components/Logo'
import { cn } from '../lib/utils'
import { forgotPasswordSchema, type ForgotPasswordFormValues } from '../lib/validators'
import api from '../lib/api'

const ForgotPasswordPage: React.FC = () => {
 const navigate = useNavigate()
 const { theme, toggleTheme } = useTheme()
 const [error, setError] = useState<string | null>(null)
 const [success, setSuccess] = useState<string | null>(null)
 const [isSubmitting, setIsSubmitting] = useState(false)

 const {
 register,
 handleSubmit,
 formState: { errors },
 } = useForm<ForgotPasswordFormValues>({
 resolver: zodResolver(forgotPasswordSchema),
 })

 const onSubmit = async (data: ForgotPasswordFormValues) => {
 setIsSubmitting(true)
 setError(null)
 setSuccess(null)
 try {
 const response = await api.post('/auth/forgot-password', { email: data.email })
 setSuccess(response.data?.data?.message || 'Verification token dispatched successfully.')
 } catch (err: any) {
 setError(err.response?.data?.error?.message || 'Failed to dispatch recovery token.')
 } finally {
 setIsSubmitting(false)
 }
 }

 return (
 <div
 className={cn(
 'min-h-screen flex items-center justify-center p-6 relative overflow-hidden font-sans antialiased selection:bg-gray-600 dark:bg-gray-600 selection:text-white transition-colors duration-500',
 theme === 'dark' ? 'bg-black text-white' : 'bg-[#fafafa] text-[#111827]'
 )}
 >
 {/* 🏛️ Professional Minimalist Background */}
 <div
 className={cn(
 'absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-none-none blur-[120px] pointer-events-none transition-all duration-500',
 theme === 'dark' ? 'bg-gray-500/10' : 'bg-gray-500/[0.03]'
 )}
 ></div>
 <div
 className={cn(
 'absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-none-none blur-[120px] pointer-events-none transition-all duration-500',
 theme === 'dark' ? 'bg-gray-500/10' : 'bg-gray-500/[0.02]'
 )}
 ></div>

 <div className="w-full max-w-[400px] relative z-10 flex flex-col gap-8">
 {/* Branding Module */}
 <motion.div
 initial={{ opacity: 0, y: 20 }}
 animate={{ opacity: 1, y: 0 }}
 className="flex flex-col items-center text-center"
 >
 <div
 className={cn(
 'w-14 h-14 mb-6 rounded-none-none flex items-center justify-center shadow-2xl relative group cursor-pointer overflow-hidden transition-all duration-500 hover:scale-105',
 theme === 'dark' ? 'bg-white text-black' : 'bg-gray-900 text-white'
 )}
 >
 <Logo size="sm" className="scale-75" />
 </div>
 <h1
 className={cn(
 'text-4xl font-black tracking-tighter uppercase leading-none transition-colors',
 theme === 'dark' ? 'text-white' : 'text-z-primary'
 )}
 >
 ZENITH
 </h1>
 <p className="mt-3 text-[9px] font-black text-z-muted uppercase tracking-[0.4em] ">
 Access_Recovery_Interface
 </p>
 </motion.div>

 {/* Form Container */}
 <motion.div
 initial={{ opacity: 0, scale: 0.98 }}
 animate={{ opacity: 1, scale: 1 }}
 className={cn(
 'border rounded-none-none p-8 shadow-2xl relative transition-all duration-500',
 'bg-z-panel border-z-border shadow-sm'
 )}
 >
 <div className="flex items-center justify-between mb-8">
 <div className="flex flex-col">
 <h2
 className={cn(
 'text-xl font-black uppercase tracking-tight transition-colors',
 theme === 'dark' ? 'text-white' : 'text-z-primary'
 )}
 >
 Recover Password
 </h2>
 <p className="text-[9px] text-z-muted font-bold uppercase tracking-widest leading-none mt-1">
 Credentials Verification
 </p>
 </div>

 {/* Theme Toggle */}
 <div
 className={cn(
 'p-1 rounded-none-none border flex items-center gap-1 transition-all',
 theme === 'dark' ? 'bg-z-hover border-z-border' : 'bg-gray-100 border-z-border'
 )}
 >
 <button
 onClick={() => theme !== 'light' && toggleTheme()}
 className={cn(
 'w-7 h-7 flex items-center justify-center rounded-none-none transition-all',
 theme === 'light'
 ? 'bg-white text-z-primary shadow-sm'
 : 'text-z-muted hover:text-white'
 )}
 >
 <Sun size={14} />
 </button>
 <button
 onClick={() => theme !== 'dark' && toggleTheme()}
 className={cn(
 'w-7 h-7 flex items-center justify-center rounded-none-none transition-all',
 theme === 'dark'
 ? 'bg-gray-900 text-white shadow-sm'
 : 'text-z-muted hover:text-white'
 )}
 >
 <Moon size={14} />
 </button>
 </div>
 </div>

 {success ? (
 <div className="space-y-6 text-center">
 <div className="flex justify-center">
 <CheckCircle className="text-gray-600 dark:text-z-secondary w-12 h-12" />
 </div>
 <p
 className={cn(
 'text-xs font-bold uppercase tracking-wide px-2 leading-relaxed',
 theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
 )}
 >
 {success}
 </p>
 <button
 onClick={() => navigate('/login')}
 className={cn(
 'w-full rounded-none-none py-4 flex items-center justify-center gap-3 text-xs font-black uppercase tracking-widest shadow-xl transition-all group',
 theme === 'dark'
 ? 'bg-white text-black hover:bg-gray-100 shadow-white/5'
 : 'bg-gray-900 text-white hover:bg-black shadow-gray-900/20'
 )}
 >
 <ArrowLeft size={16} />
 <span>Return to Login</span>
 </button>
 </div>
 ) : (
 <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
 {error && (
 <div
 className={cn(
 'border rounded-none-none p-4 flex items-center gap-3 mb-6 overflow-hidden transition-colors',
 theme === 'dark'
 ? 'bg-red-500/10 border-red-500/20 text-red-400'
 : 'bg-red-50 border-red-100 text-red-600'
 )}
 >
 <AlertCircle size={14} className="shrink-0" />
 <span className="text-[10px] font-bold uppercase tracking-wide">{error}</span>
 </div>
 )}

 <div className="space-y-1.5">
 <label className="text-[9px] font-black text-z-muted uppercase tracking-widest px-1">
 Email Address
 </label>
 <div className="relative group">
 <Mail
 className={cn(
 'absolute left-4 top-1/2 -translate-y-1/2 transition-colors',
 theme === 'dark'
 ? 'text-white/20 group-focus-within:text-gray-600 dark:text-z-muted'
 : 'text-gray-300 group-focus-within:text-gray-600'
 )}
 size={16}
 />
 <input
 {...register('email')}
 type="email"
 placeholder="Enter your email"
 className={cn(
 'w-full border rounded-none-none py-3 pl-12 pr-4 text-xs font-bold outline-none focus-visible:ring-2 focus-visible:ring-gray-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-black transition-all',
 theme === 'dark'
 ? 'bg-z-hover border-z-border text-white focus:bg-white/10 focus:ring-2 focus:ring-gray-500/20'
 : 'bg-z-input border-z-border shadow-sm text-z-primary focus:bg-white focus:ring-2 focus:ring-gray-100'
 )}
 />
 </div>
 {errors.email && (
 <p className="text-[9px] text-red-500 font-bold mt-1 px-1">
 {errors.email.message}
 </p>
 )}
 </div>

 <button
 type="submit"
 disabled={isSubmitting}
 className={cn(
 'w-full rounded-none-none py-4 flex items-center justify-center gap-3 text-xs font-black uppercase tracking-widest shadow-xl transition-all group disabled:opacity-50 disabled:pointer-events-none',
 theme === 'dark'
 ? 'bg-white text-black hover:bg-gray-100 shadow-white/5'
 : 'bg-gray-900 text-white hover:bg-black shadow-gray-900/20'
 )}
 >
 {isSubmitting ? (
 <Loader2 size={18} className="animate-spin" />
 ) : (
 <>
 <span>Dispatch Recovery Node</span>
 <ArrowRight
 size={16}
 className="group-hover:translate-x-1 transition-transform"
 />
 </>
 )}
 </button>

 <div className="text-center pt-2">
 <Link
 to="/login"
 className={cn(
 'text-[9px] font-black uppercase tracking-widest hover:underline flex items-center justify-center gap-2 transition-colors',
 theme === 'dark'
 ? 'text-gray-600 dark:text-z-muted hover:text-gray-300'
 : 'text-gray-600 hover:text-gray-700'
 )}
 >
 <ArrowLeft size={10} />
 <span>Return to Login</span>
 </Link>
 </div>
 </form>
 )}
 </motion.div>

 <p className="text-center text-[8px] font-bold text-z-muted uppercase tracking-[0.2em] ">
 Authorized Personnel Only • Zenith CMS Engine
 </p>
 </div>
 </div>
 )
}

export default ForgotPasswordPage
