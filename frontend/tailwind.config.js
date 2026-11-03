/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        ellenco: {
          navy: '#174675',
          red: '#ef3f43',
          mist: '#f5f8fc'
        },
        border: 'var(--line)',
        input: 'var(--input)',
        ring: 'var(--primary)',
        background: 'var(--canvas)',
        foreground: 'var(--text)',
        primary: {
          DEFAULT: 'var(--primary)',
          foreground: '#ffffff'
        },
        secondary: {
          DEFAULT: 'var(--surface-soft)',
          foreground: 'var(--text)'
        },
        destructive: {
          DEFAULT: '#ef4444',
          foreground: '#ffffff'
        },
        muted: {
          DEFAULT: 'var(--surface-soft)',
          foreground: 'var(--muted)'
        },
        accent: {
          DEFAULT: 'var(--primary-soft)',
          foreground: 'var(--primary)'
        },
        popover: {
          DEFAULT: 'var(--surface)',
          foreground: 'var(--text)'
        },
        card: {
          DEFAULT: 'var(--surface)',
          foreground: 'var(--text)'
        }
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace']
      },
      borderRadius: {
        lg: '16px',
        md: '12px',
        sm: '8px'
      },
      transitionTimingFunction: {
        smooth: 'cubic-bezier(0.2, 0.9, 0.25, 1)',
        spring: 'cubic-bezier(0.16, 1, 0.3, 1)'
      },
      keyframes: {
        fadeSlideIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        fadeScaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.97)' },
          '100%': { opacity: '1', transform: 'scale(1)' }
        }
      },
      animation: {
        fadeSlideIn: 'fadeSlideIn 0.4s cubic-bezier(0.2, 0.9, 0.25, 1) forwards',
        fadeScaleIn: 'fadeScaleIn 0.3s cubic-bezier(0.2, 0.9, 0.25, 1) forwards'
      }
    }
  },
  plugins: []
};
