/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // --- Zenith Core Semantic Theme Colors ---
        'z-base': 'var(--z-bg-base)',
        'z-sidebar': 'var(--z-bg-sidebar)',
        'z-header': 'var(--z-bg-header)',
        'z-panel': 'var(--z-bg-panel)',
        'z-input': 'var(--z-bg-input)',
        'z-hover': 'var(--z-bg-hover)',
        'z-popover': 'var(--z-bg-popover)',
        'z-tooltip': 'var(--z-bg-tooltip)',
        'z-modal': 'var(--z-bg-modal)',
        'z-row-hover': 'var(--z-bg-row-hover)',
        'z-selected': 'var(--z-bg-selected)',
        'z-code': 'var(--z-bg-code)',
        
        'z-border': 'var(--z-border)',
        'z-border-strong': 'var(--z-border-strong)',
        'z-border-focus': 'var(--z-border-focus)',
        'z-border-input': 'var(--z-border-input)',

        'z-text-primary': 'var(--z-text-primary)',
        'z-text-secondary': 'var(--z-text-secondary)',
        'z-text-muted': 'var(--z-text-muted)',
        'z-text-inverse': 'var(--z-text-inverse)',

        'z-accent': 'var(--z-accent)',
        'z-active-text': 'var(--z-active-text)',
        'z-active-bg': 'var(--z-active-bg)',
        'z-active-border': 'var(--z-active-border)',

        // --- Legacy fallback colors ---
        app: 'rgb(var(--bg-app-rgb) / <alpha-value>)',
        surface: 'rgb(var(--bg-surface-rgb) / <alpha-value>)',
        subtle: 'rgb(var(--bg-subtle-rgb) / <alpha-value>)',
        primary: 'rgb(var(--text-primary-rgb) / <alpha-value>)',
        secondary: 'rgb(var(--text-secondary-rgb) / <alpha-value>)',
        muted: 'rgb(var(--text-muted-rgb) / <alpha-value>)',
        accent: 'rgb(var(--accent-rgb) / <alpha-value>)',
        'accent-hover': 'rgb(var(--accent-hover-rgb) / <alpha-value>)',
        danger: 'rgb(var(--danger-rgb) / <alpha-value>)',
        success: 'rgb(var(--success-rgb) / <alpha-value>)',
        warning: 'rgb(var(--warning-rgb) / <alpha-value>)',
        border: {
          DEFAULT: 'rgb(var(--border-rgb) / <alpha-value>)',
          strong: 'var(--border-strong)',
        },
      },
      borderRadius: {
        DEFAULT: '12px',
        sm: '8px',
        md: '12px',
        lg: '16px',
        xl: '24px',
      },
      height: {
        input: '36px',
        button: '36px',
        row: '40px',
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
}
