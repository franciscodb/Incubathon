/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['Sora', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Marca: indigo-violeta premium (twilight)
        brand: {
          50: '#eef0ff',
          100: '#e0e3ff',
          200: '#c7ccff',
          300: '#a5a6ff',
          400: '#877fff',
          500: '#6d5efc',
          600: '#5b45f0',
          700: '#4d38d4',
          800: '#3f2faa',
          900: '#362c85',
          950: '#221a4e',
        },
        // Acento cálido (ámbar/atardecer)
        accent: {
          50: '#fff7ed',
          100: '#ffedd4',
          200: '#ffd8a8',
          300: '#ffbb70',
          400: '#ff9838',
          500: '#fb7c14',
          600: '#ec6109',
          700: '#c3480a',
          800: '#9b3910',
          900: '#7c3110',
          950: '#431705',
        },
        ink: {
          50: '#f6f7fb',
          100: '#eceef6',
          200: '#d6dae9',
          300: '#b2bad2',
          400: '#8791b5',
          500: '#66709b',
          600: '#515981',
          700: '#434969',
          800: '#3a3f58',
          900: '#20233a',
          950: '#0b0d1a',
        },
        // Semáforo de cumplimiento
        verde: { light: '#dcfce7', DEFAULT: '#16a34a', dark: '#166534' },
        amarillo: { light: '#fef9c3', DEFAULT: '#ca8a04', dark: '#854d0e' },
        naranja: { light: '#ffedd5', DEFAULT: '#ea580c', dark: '#9a3412' },
        rojo: { light: '#fee2e2', DEFAULT: '#dc2626', dark: '#991b1b' },
      },
      backgroundImage: {
        'mesh-twilight':
          'radial-gradient(60rem 40rem at 15% -10%, rgba(109,94,252,0.25), transparent 60%), radial-gradient(50rem 40rem at 110% 10%, rgba(251,124,20,0.18), transparent 55%), radial-gradient(40rem 30rem at 50% 120%, rgba(109,94,252,0.14), transparent 60%)',
      },
      boxShadow: {
        card: '0 1px 3px 0 rgb(16 20 45 / 0.06), 0 1px 2px -1px rgb(16 20 45 / 0.05)',
        'card-hover': '0 24px 60px -24px rgb(60 45 170 / 0.35)',
        glass: '0 8px 32px -8px rgb(16 20 45 / 0.24), inset 0 1px 0 0 rgb(255 255 255 / 0.55)',
        'glass-lg': '0 30px 80px -30px rgb(30 22 90 / 0.45), inset 0 1px 0 0 rgb(255 255 255 / 0.6)',
        glow: '0 0 0 1px rgb(109 94 252 / 0.25), 0 12px 40px -12px rgb(109 94 252 / 0.55)',
      },
      backdropBlur: {
        xs: '2px',
      },
      borderRadius: {
        '2.5xl': '1.25rem',
        '4xl': '2rem',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(24px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        float: {
          '0%,100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        'pulse-ring': {
          '0%': { boxShadow: '0 0 0 0 rgb(34 197 94 / 0.45)' },
          '70%': { boxShadow: '0 0 0 10px rgb(34 197 94 / 0)' },
          '100%': { boxShadow: '0 0 0 0 rgb(34 197 94 / 0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.5s ease-out both',
        'fade-up': 'fade-up 0.7s cubic-bezier(0.22,1,0.36,1) both',
        float: 'float 7s ease-in-out infinite',
        'pulse-ring': 'pulse-ring 2s infinite',
      },
    },
  },
  plugins: [],
}
