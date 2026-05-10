/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        app: {
          bg: '#FAFAFA',
          surface: '#FFFFFF',
          subtle: '#F5F5F5',
        },
        border: {
          DEFAULT: '#E5E5E5',
          strong: '#D4D4D4',
        },
        text: {
          primary: '#0A0A0A',
          secondary: '#6B6B6B',
          muted: '#A3A3A3',
        },
        accent: {
          DEFAULT: '#0A0A0A',
          hover: '#262626',
        },
        danger: '#DC2626',
        success: '#16A34A',
        warning: '#CA8A04',
      },
      borderRadius: {
        DEFAULT: '4px',
        sm: '2px',
        md: '4px',
        lg: '6px',
      },
      height: {
        input: '36px',
        button: '36px',
        row: '40px',
      }
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
