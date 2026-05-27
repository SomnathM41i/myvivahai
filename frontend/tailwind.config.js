export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f0ff', 100: '#e0e0ff', 200: '#c4b5fd',
          300: '#a78bfa', 400: '#8b5cf6', 500: '#7c3aed',
          600: '#6d28d9', 700: '#5b21b6', 800: '#4c1d95', 900: '#3b0764',
        },
        surface: {
          50: '#f8f9fc', 100: '#f1f3f8', 200: '#e4e7f0',
          300: '#cdd1dc', 400: '#9ca0ae', 500: '#6b7080',
          600: '#4a4e5a', 700: '#333742', 800: '#1e2028', 900: '#0f1015',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 2px 8px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.03)',
        'card': '0 4px 16px rgba(0,0,0,0.04), 0 1px 4px rgba(0,0,0,0.03)',
        'card-hover': '0 12px 32px rgba(0,0,0,0.06), 0 2px 8px rgba(0,0,0,0.04)',
        'glow': '0 0 20px rgba(124,58,237,0.15)',
        'glow-lg': '0 0 40px rgba(124,58,237,0.2)',
        'drawer': '-4px 0 24px rgba(0,0,0,0.08)',
        'modal': '0 20px 60px rgba(0,0,0,0.12)',
      },
      backdropBlur: {
        glass: '16px',
      },
      animation: {
        'shimmer': 'shimmer 2s infinite linear',
        'float': 'float 3s ease-in-out infinite',
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
        'progress': 'progress-indeterminate 1.5s ease-in-out infinite',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        'glow-pulse': {
          '0%, 100%': { boxShadow: '0 0 12px rgba(124,58,237,0.2)' },
          '50%': { boxShadow: '0 0 24px rgba(124,58,237,0.4)' },
        },
        'progress-indeterminate': {
          '0%': { transform: 'translateX(-100%)', width: '40%' },
          '50%': { transform: 'translateX(150%)', width: '60%' },
          '100%': { transform: 'translateX(400%)', width: '40%' },
        },
      },
    },
  },
  plugins: [],
}
