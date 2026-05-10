import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Lock, Mail, Loader2, AlertCircle } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

import logo from '../assets/logo.svg';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [error, setError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormValues) => {
    setIsSubmitting(true);
    setError(null);
    try {
      await login(data.email, data.password);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-app-bg flex items-center justify-center p-4">
      <div className="w-full max-w-[400px]">
        {/* Logo/Brand */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 mb-4 drop-shadow-xl">
            <img src={logo} alt="Zenith CMS Logo" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">Zenith CMS</h1>
          <p className="text-text-secondary mt-2">Sign in to manage your content</p>
        </div>

        <div className="card p-8 shadow-md">
          {error && (
            <div className="mb-6 p-3 bg-danger/10 border border-danger/20 rounded flex items-center gap-3 text-danger text-sm">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text-secondary flex items-center gap-2">
                <Mail size={14} />
                Email
              </label>
              <input
                {...register('email')}
                type="email"
                placeholder="name@example.com"
                className="w-full"
              />
              {errors.email && (
                <p className="text-xs text-danger mt-1">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text-secondary flex items-center gap-2">
                <Lock size={14} />
                Password
              </label>
              <input
                {...register('password')}
                type="password"
                placeholder="••••••••"
                className="w-full"
              />
              {errors.password && (
                <p className="text-xs text-danger mt-1">{errors.password.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn btn-primary w-full h-10 mt-6"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign in'
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-text-muted mt-8">
          Zenith CMS v0.1 — Secure Content Management
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
