/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      colors: {
        ink: {
          DEFAULT: '#14142B',
          soft: '#4E4B66',
          muted: '#6E7191',
        },
        canvas: '#F6F6FB',
        line: '#E6E6F0',
        brand: {
          50: '#F1F0FF',
          100: '#E4E2FF',
          200: '#CBC7FF',
          300: '#A9A2FF',
          400: '#8A7FFB',
          500: '#6C5CF5',
          600: '#5A45E8',
          700: '#4A36C9',
          800: '#3C2DA1',
          900: '#2C2276',
        },
        // Player marks: X is coral, O is ocean. Shapes are always shown too.
        xmark: { light: '#FFE4E8', DEFAULT: '#F2456A', dark: '#C72550' },
        omark: { light: '#DDF3FF', DEFAULT: '#1597E5', dark: '#0B6FB0' },
      },
      boxShadow: {
        card: '0 1px 2px rgba(20,20,43,0.04), 0 8px 24px -12px rgba(20,20,43,0.12)',
        lift: '0 2px 4px rgba(20,20,43,0.05), 0 18px 40px -16px rgba(20,20,43,0.25)',
        glow: '0 0 0 4px rgba(108,92,245,0.15)',
      },
      borderRadius: { '4xl': '2rem' },
      keyframes: {
        pop: {
          '0%': { transform: 'scale(0.4)', opacity: '0' },
          '70%': { transform: 'scale(1.08)', opacity: '1' },
          '100%': { transform: 'scale(1)' },
        },
        draw: { to: { strokeDashoffset: '0' } },
        'fade-up': {
          '0%': { transform: 'translateY(8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        drop: {
          '0%': { transform: 'translateY(var(--drop-from))' },
          '75%': { transform: 'translateY(4%)' },
          '100%': { transform: 'translateY(0)' },
        },
        'win-pulse': {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.06)' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-4px)' },
          '75%': { transform: 'translateX(4px)' },
        },
        'float-up': {
          '0%': { transform: 'translateY(0) scale(0.6)', opacity: '0' },
          '15%': { transform: 'translateY(-10px) scale(1.1)', opacity: '1' },
          '100%': { transform: 'translateY(-160px) scale(1)', opacity: '0' },
        },
        confetti: {
          '0%': { transform: 'translate3d(0,-10vh,0) rotate(0deg)', opacity: '1' },
          '100%': { transform: 'translate3d(var(--drift),105vh,0) rotate(720deg)', opacity: '0.9' },
        },
        blink: { '0%, 80%, 100%': { opacity: '0.25' }, '40%': { opacity: '1' } },
      },
      animation: {
        pop: 'pop 260ms cubic-bezier(.2,.9,.3,1.2) both',
        draw: 'draw 320ms ease-out forwards',
        'fade-up': 'fade-up 360ms ease-out both',
        float: 'float 5s ease-in-out infinite',
        drop: 'drop 420ms cubic-bezier(.35,.0,.45,1) both',
        'win-pulse': 'win-pulse 1.1s ease-in-out infinite',
        shake: 'shake 260ms ease-in-out',
        'float-up': 'float-up 2.2s ease-out forwards',
        confetti: 'confetti var(--duration) linear forwards',
        blink: 'blink 1.4s infinite both',
      },
    },
  },
  plugins: [],
};
