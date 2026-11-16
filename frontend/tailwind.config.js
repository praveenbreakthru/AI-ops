/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        obsidian: {
          950: '#070a13',
          900: '#0b101d',
          850: '#0f172a',
          800: '#151f32',
          750: '#1b273e',
          700: '#23324f'
        },
        compute: {
          light: '#a78bfa',
          DEFAULT: '#8b5cf6',
          dark: '#6d28d9',
          glow: 'rgba(139, 92, 246, 0.25)'
        },
        memory: {
          light: '#22d3ee',
          DEFAULT: '#06b6d4',
          dark: '#0e7490',
          glow: 'rgba(6, 182, 212, 0.25)'
        },
        storage: {
          light: '#34d399',
          DEFAULT: '#10b981',
          dark: '#047857',
          glow: 'rgba(16, 185, 129, 0.25)'
        },
        network: {
          light: '#fbbf24',
          DEFAULT: '#f59e0b',
          dark: '#b45309',
          glow: 'rgba(245, 158, 11, 0.25)'
        },
        ai: {
          light: '#f472b6',
          DEFAULT: '#d946ef',
          dark: '#a21caf',
          glow: 'rgba(217, 70, 239, 0.25)'
        },
        node: {
          windows: '#0284c7',
          linux: '#f97316'
        }
      },
      boxShadow: {
        'glow-compute': '0 0 25px -5px rgba(139, 92, 246, 0.3)',
        'glow-memory': '0 0 25px -5px rgba(6, 182, 212, 0.3)',
        'glow-storage': '0 0 25px -5px rgba(16, 185, 129, 0.3)',
        'glow-network': '0 0 25px -5px rgba(245, 158, 11, 0.3)',
        'glow-ai': '0 0 25px -5px rgba(217, 70, 239, 0.35)',
        'glow-card': '0 8px 30px rgba(0, 0, 0, 0.4)',
        'glass-card': '0 4px 20px 0 rgba(0, 0, 0, 0.35), inset 0 1px 0 0 rgba(255, 255, 255, 0.08)'
      }
    },
  },
  plugins: [],
}

