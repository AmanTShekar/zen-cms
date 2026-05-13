import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
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
  WifiOff
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';
import Logo from '../components/Logo';
import { cn } from '../lib/utils';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const { theme, toggleTheme } = useTheme();
  const [error, setError] = useState<{ message: string; type: 'auth' | 'network' } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormValues) => {
    setIsSubmitting(true);
    setError(null);
    try {
      await login(data.email, data.password);
      navigate('/');
    } catch {
      if (err.code === 'ERR_NETWORK' || !err.response) {
        setError({ message: 'Kernel Offline: Connection Refused', type: 'network' });
      } else {
        setError({ message: err.response?.data?.error?.message || 'Access Denied: Invalid Username or Password', type: 'auth' });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const fillCredentials = () => {
    setValue('email', 'admin@zenith.com');
    setValue('password', 'password123');
  };

  return (
    <div className={cn(
      "min-h-screen flex items-center justify-center p-6 relative overflow-hidden font-sans antialiased selection:bg-indigo-600 selection:text-white transition-colors duration-500",
      theme === 'dark' ? "bg-black text-white" : "bg-[#fafafa] text-[#111827]"
    )}>
      {/* 🏛️ Professional Minimalist Background */}
      <div className={cn(
        "absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-none blur-[120px] pointer-events-none transition-all duration-500",
        theme === 'dark' ? "bg-indigo-500/10" : "bg-indigo-500/[0.03]"
      )}></div>
      <div className={cn(
        "absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-none blur-[120px] pointer-events-none transition-all duration-500",
        theme === 'dark' ? "bg-indigo-500/10" : "bg-indigo-500/[0.02]"
      )}></div>
      
      <div className="w-full max-w-[400px] relative z-10 flex flex-col gap-8">
        {/* Branding Module */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center text-center"
        >
          <div className={cn(
            "w-14 h-14 mb-6 rounded-none flex items-center justify-center shadow-2xl relative group cursor-pointer overflow-hidden transition-all duration-500 hover:scale-105",
            theme === 'dark' ? "bg-white text-black" : "bg-gray-900 text-white"
          )}>
             <Logo size="sm" className="scale-75" />
          </div>
          <h1 className={cn("text-4xl font-black tracking-tighter uppercase italic leading-none transition-colors", theme === 'dark' ? "text-white" : "text-gray-900")}>ZENITH</h1>
          <p className="mt-3 text-[9px] font-black text-gray-400 uppercase tracking-[0.4em] italic">Admin_Management_Interface</p>
        </motion.div>

        {/* Login Container */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className={cn(
            "border rounded-none p-8 shadow-2xl relative transition-all duration-500",
            theme === 'dark' ? "bg-white/[0.02] border-white/5" : "bg-white border-gray-100"
          )}
        >
          <div className="flex items-center justify-between mb-8">
             <div className="flex flex-col">
                <h2 className={cn("text-xl font-black uppercase italic tracking-tight transition-colors", theme === 'dark' ? "text-white" : "text-gray-900")}>Sign In</h2>
                <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest italic leading-none mt-1">Access Controlled</p>
             </div>
             
             {/* 🌗 Theme Toggle Module */}
             <div className={cn(
                "p-1 rounded-none border flex items-center gap-1 transition-all",
                theme === 'dark' ? "bg-white/5 border-white/10" : "bg-gray-100 border-gray-200"
             )}>
                <button onClick={() => theme !== 'light' && toggleTheme()} className={cn("w-7 h-7 flex items-center justify-center rounded-none transition-all", theme === 'light' ? "bg-white text-gray-900 shadow-sm" : "text-gray-400 hover:text-white")}>
                   <Sun size={14} />
                </button>
                <button onClick={() => theme !== 'dark' && toggleTheme()} className={cn("w-7 h-7 flex items-center justify-center rounded-none transition-all", theme === 'dark' ? "bg-gray-900 text-white shadow-sm" : "text-gray-400 hover:text-white")}>
                   <Moon size={14} />
                </button>
             </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <AnimatePresence mode="wait">
              {error && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className={cn(
                   "border rounded-none p-4 flex items-center gap-3 mb-6 overflow-hidden transition-colors",
                   error.type === 'network' 
                     ? (theme === 'dark' ? "bg-amber-500/10 border-amber-500/20 text-amber-400" : "bg-amber-50 border-amber-100 text-amber-600")
                     : (theme === 'dark' ? "bg-red-500/10 border-red-500/20 text-red-400" : "bg-red-50 border-red-100 text-red-600")
                )}>
                   {error.type === 'network' ? <WifiOff size={14} className="shrink-0" /> : <AlertCircle size={14} className="shrink-0" />}
                   <span className="text-[10px] font-bold uppercase tracking-wide">{error.message}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest italic px-1">Email Address</label>
                <div className="relative group">
                  <Mail className={cn("absolute left-4 top-1/2 -translate-y-1/2 transition-colors", theme === 'dark' ? "text-white/20 group-focus-within:text-indigo-400" : "text-gray-300 group-focus-within:text-indigo-600")} size={16} />
                  <input 
                    {...register('email')} 
                    type="email" 
                    placeholder="admin@zenith.com" 
                    className={cn(
                      "w-full border rounded-none py-3 pl-12 pr-4 text-xs font-bold outline-none transition-all",
                      theme === 'dark' 
                        ? "bg-white/5 border-white/10 text-white focus:bg-white/10 focus:ring-2 focus:ring-indigo-500/20" 
                        : "bg-gray-50 border-gray-100 text-gray-900 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                    )} 
                  />
                </div>
                {errors.email && <p className="text-[9px] text-red-500 font-bold mt-1 px-1">{errors.email.message}</p>}
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest italic px-1">Account Password</label>
                <div className="relative group">
                  <Lock className={cn("absolute left-4 top-1/2 -translate-y-1/2 transition-colors", theme === 'dark' ? "text-white/20 group-focus-within:text-indigo-400" : "text-gray-300 group-focus-within:text-indigo-600")} size={16} />
                  <input 
                    {...register('password')} 
                    type={showPassword ? 'text' : 'password'} 
                    placeholder="••••••••" 
                    className={cn(
                      "w-full border rounded-none py-3 pl-12 pr-12 text-xs font-bold outline-none transition-all",
                      theme === 'dark' 
                        ? "bg-white/5 border-white/10 text-white focus:bg-white/10 focus:ring-2 focus:ring-indigo-500/20" 
                        : "bg-gray-50 border-gray-100 text-gray-900 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                    )} 
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowPassword(!showPassword)} 
                    className={cn(
                       "absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-none transition-colors",
                       theme === 'dark' ? "text-white/20 hover:text-white" : "text-gray-300 hover:text-gray-900"
                    )}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.password && <p className="text-[9px] text-red-500 font-bold mt-1 px-1">{errors.password.message}</p>}
              </div>
            </div>

            <button type="submit" disabled={isSubmitting} className={cn(
               "w-full rounded-none py-4 flex items-center justify-center gap-3 text-xs font-black uppercase tracking-widest shadow-xl transition-all group disabled:opacity-50 disabled:pointer-events-none",
               theme === 'dark' ? "bg-white text-black hover:bg-gray-100 shadow-white/5" : "bg-gray-900 text-white hover:bg-black shadow-gray-900/20"
            )}>
              {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : (
                <>
                  <span>Sign In to Station</span>
                  <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* 🔑 Credentials Hint Module */}
          <div 
             onClick={fillCredentials}
             className={cn(
                "mt-8 p-4 border rounded-none space-y-3 cursor-pointer group hover:scale-[1.02] active:scale-[0.98] transition-all",
                theme === 'dark' ? "bg-indigo-500/5 border-indigo-500/10" : "bg-indigo-50/50 border-indigo-100"
             )}
          >
             <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-indigo-500">
                   <Info size={12} />
                   <span className="text-[8px] font-black uppercase tracking-widest italic">Default_Credentials</span>
                </div>
                <div className="flex items-center gap-2 text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity">
                   <span className="text-[7px] font-black uppercase">Auto_Fill</span>
                   <MousePointer2 size={10} />
                </div>
             </div>
             <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                   <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest italic">User_UID</span>
                   <code className={cn("text-[9px] font-black transition-colors", theme === 'dark' ? "text-white/60" : "text-indigo-900")}>admin@zenith.com</code>
                </div>
                <div className="flex items-center justify-between">
                   <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest italic">Password</span>
                   <code className={cn("text-[9px] font-black transition-colors", theme === 'dark' ? "text-white/60" : "text-indigo-900")}>password123</code>
                </div>
             </div>
          </div>
        </motion.div>
        
        <p className="text-center text-[8px] font-bold text-gray-400 uppercase tracking-[0.2em] italic">Authorized Personnel Only • Zenith CMS Engine</p>
      </div>
    </div>
  );
};

export default LoginPage;
