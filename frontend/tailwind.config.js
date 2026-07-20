/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50:  '#e9f1f2',
          100: '#d2e3e5',
          200: '#a6c8cc',
          300: '#79acb3',
          400: '#4d9199',
          500: '#2f6b7a',
          600: '#285c69',
          700: '#1f4a55',
          800: '#163841',
          900: '#0d252c',
        },
        sidebar: {
          DEFAULT: '#22333a',
          fg:     '#eef3f3',
          muted:  '#8fa3aa',
        },
        surface: {
          DEFAULT: '#ffffff',
          2:       '#fafbfc',
        },
        border: {
          DEFAULT: '#e4e8e9',
        },
      },
      fontFamily: {
        'sans': [
          'Hanken Grotesk',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'sans-serif',
        ],
      },
      borderRadius: {
        'xl':  '0.75rem',
        '2xl': '0.875rem',
        '3xl': '1rem',
      },
      boxShadow: {
        'card': '0 1px 2px rgba(20,40,45,0.05),0 4px 14px rgba(20,40,45,0.05)',
        'soft': '0 2px 8px rgba(20,40,45,0.08)',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
    require('@tailwindcss/aspect-ratio'),
  ],
}
