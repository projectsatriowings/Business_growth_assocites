/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Approved Master Palette:
        // Primary Blue: #3066BE
        // Teal: #119DA4
        // Secondary Blue: #6D96C5
        // Aqua: #80DED9
        // Light Aqua: #AEECEF
        bga: {
          blue: '#3066BE',
          'blue-hover': '#25549e',
          'blue-light': '#edf4fc',
          teal: '#119DA4',
          'teal-hover': '#0d8187',
          'teal-light': '#e7f7f8',
          secondary: '#6D96C5',
          'secondary-light': '#f0f5fa',
          aqua: '#80DED9',
          'aqua-soft': '#d9f7f5',
          'light-aqua': '#AEECEF',
          navy: '#152544',
          dark: '#0f172a',
          surface: '#f8fafc',
          card: '#ffffff',
          border: '#e2e8f0',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        'subtle': '0 1px 3px 0 rgba(48, 102, 190, 0.05), 0 1px 2px 0 rgba(48, 102, 190, 0.03)',
        'card': '0 4px 20px -2px rgba(48, 102, 190, 0.08)',
        'card-hover': '0 12px 32px -4px rgba(48, 102, 190, 0.14)',
        'teal-glow': '0 4px 20px -2px rgba(17, 157, 164, 0.25)',
        'blue-glow': '0 4px 20px -2px rgba(48, 102, 190, 0.25)',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        pulseSlow: {
          '0%, 100%': { opacity: '0.4' },
          '50%': { opacity: '0.8' },
        },
      },
      animation: {
        fadeIn: 'fadeIn 0.3s ease-out forwards',
        slideUp: 'slideUp 0.4s ease-out forwards',
        float: 'float 5s ease-in-out infinite',
        pulseSlow: 'pulseSlow 4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
