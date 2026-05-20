/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
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
