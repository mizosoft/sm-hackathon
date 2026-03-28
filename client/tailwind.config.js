/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#0d0905',
          900: '#130c07',
          800: '#1c1209',
          700: '#25180d',
          600: '#312014',
          500: '#42281a',
        },
        slate: {
          dim:    '#3e2d1e',
          mid:    '#7a5c3e',
          soft:   '#a07c58',
          muted:  '#c4a07c',
          light:  '#ddc0a0',
          bright: '#f0e4d0',
        },
        accent: {
          DEFAULT: '#c07840',
          dim:     '#7c4e28',
          glow:    'rgba(192,120,64,0.15)',
        },
        danger: {
          DEFAULT: '#c04030',
          dim:     '#1e0a08',
          border:  '#5e1c18',
        },
        warn: {
          DEFAULT: '#b07828',
          dim:     '#180f04',
          border:  '#4e3810',
        },
        good: {
          DEFAULT: '#4a8050',
          dim:     '#071208',
          border:  '#1c4428',
        },
      },
      animation: {
        'fade-up': 'fadeUp 0.25s ease-out',
        'fade-in': 'fadeIn 0.2s ease-out',
        'cursor-blink': 'cursorBlink 1s step-end infinite',
      },
      keyframes: {
        fadeUp: {
          '0%':   { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        cursorBlink: {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0' },
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'Menlo', 'monospace'],
      },
    },
  },
  plugins: [],
};
