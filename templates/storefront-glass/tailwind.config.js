/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        zenith: {
          base: '#0B0F19',
          surface: '#111827',
          surface2: '#1a1f2e',
          border: 'rgba(255, 255, 255, 0.08)',
          accent: '#6366f1',
          accentBright: '#818cf8',
          accentDim: 'rgba(99, 102, 241, 0.15)',
          text: '#e2e8f0',
          textMuted: 'rgba(226, 232, 240, 0.5)',
          textDim: 'rgba(226, 232, 240, 0.3)',
        },
      },
      fontFamily: {
        sans: ['Outfit', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      backgroundImage: {
        'zenith-gradient':
          'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(99,102,241,0.15), transparent)',
        'zenith-gradient-2':
          'radial-gradient(ellipse 60% 40% at 80% 60%, rgba(139,92,246,0.1), transparent)',
        'glass-gradient':
          'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
      },
      backdropBlur: {
        glass: '16px',
        glassSm: '8px',
      },
      boxShadow: {
        glass:
          '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.06), 0 0 0 1px rgba(255,255,255,0.05)',
        'glass-hover':
          '0 16px 48px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.08), 0 0 0 1px rgba(99,102,241,0.2)',
        glow: '0 0 40px rgba(99,102,241,0.2)',
        'glow-sm': '0 0 20px rgba(99,102,241,0.15)',
      },
      animation: {
        'fade-in': 'fadeIn 0.6s ease-out forwards',
        'slide-up': 'slideUp 0.6s ease-out forwards',
        'float': 'float 6s ease-in-out infinite',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        shimmer: 'shimmer 2s linear infinite',
        'progress-bar': 'progressBar 0.1s linear',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
}