/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cosmic: {
          void: '#0B0F19',     // Main app deep space background
          card: '#131B2E',     // Card-UI surface
          surface: '#1E293B',  // Container surface & border
          border: '#1E293B',   // Canonical 2px border color
          blue: '#38BDF8',     // Celestial cyan/water accent
          deep: '#0284C7',     // Deep ocean primary
          purple: '#818CF8',   // Nebula lavender/Voyager hair
          gold: '#FBBF24',     // Celestial stars, streak flame, crown
          star: '#FDE047',     // Shimmering star highlights
          muted: '#64748B',    // Subdued secondary text
          text: '#F8FAFC',     // Crisp white primary text
        },
      },
      boxShadow: {
        'card': '0 4px 0 #1E293B',
        'card-active': '0 2px 0 #1E293B',
        'glow-blue': '0 0 15px rgba(56, 189, 248, 0.35)',
        'glow-gold': '0 0 15px rgba(251, 191, 36, 0.4)',
      },
      borderWidth: {
        '2': '2px',
        '3': '3px',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        wave: {
          '0%': { transform: 'translateX(0)' },
          '50%': { transform: 'translateX(-25%)' },
          '100%': { transform: 'translateX(0)' },
        },
        pulseGlow: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.8', transform: 'scale(1.05)' },
        },
      },
      animation: {
        'float': 'float 3s ease-in-out infinite',
        'wave': 'wave 8s ease-in-out infinite',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
