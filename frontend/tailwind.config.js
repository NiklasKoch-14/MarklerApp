/** @type {import('tailwindcss').Config} */

// Farben zeigen bewusst auf die CSS-Variablen aus styles.scss statt eigene Hex-Werte
// zu fuehren. Vorher standen dieselben Werte doppelt -- einmal als Variable, die dem
// .dark-Theme folgt, und einmal hier als eingefrorener Hex-Wert. Jede gefaerbte
// Tailwind-Klasse brauchte deshalb ein dark:-Gegenstueck, und wo das fehlte, stand
// das Element im Dark Mode falsch.
//
// Einschraenkung: auf diesen Farben funktioniert die Opacity-Kurzschreibweise
// (bg-surface/50) nicht, weil var() keine Kanalwerte liefert. Fuer abgeschwaechte
// Flaechen gibt es die --*-soft-Variablen des Designsystems.
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Marke. Die Skala bleibt bestehen, weil ring-primary-500 und
        // text-primary-600 im Bestand verwendet werden; die Stufen mit
        // Variablen-Gegenstueck zeigen darauf, die uebrigen bleiben Abstufungen.
        primary: {
          DEFAULT: 'var(--primary)',
          50:  'var(--accent-soft)',
          100: '#d2e3e5',
          200: '#a6c8cc',
          300: '#79acb3',
          400: '#4d9199',
          500: 'var(--primary)',
          600: 'var(--primary-hover)',
          700: '#1f4a55',
          800: '#163841',
          900: '#0d252c',
          fg:  'var(--primary-fg)',
        },
        sidebar: {
          DEFAULT: 'var(--sidebar-bg)',
          fg:      'var(--sidebar-fg)',
          muted:   'var(--sidebar-muted)',
          active:  'var(--sidebar-active)',
        },
        // Diese vier tragen das Theme: wer sie benutzt, braucht keine dark:-Variante.
        surface: {
          DEFAULT: 'var(--surface)',
          2:       'var(--surface-2)',
        },
        page: 'var(--bg)',
        overlay: 'var(--overlay)',
        border: {
          DEFAULT: 'var(--border)',
        },
        body: {
          DEFAULT: 'var(--text)',
          2:       'var(--text-2)',
          3:       'var(--text-3)',
        },
        // Die vier semantischen Farben des Designsystems. Neue Zustandsfarben
        // gehoeren hier hinein, nicht als neuer Hue ins Markup.
        success: { DEFAULT: 'var(--color-success)', soft: 'var(--color-success-soft)' },
        warning: { DEFAULT: 'var(--color-warning)', soft: 'var(--color-warning-soft)' },
        error:   { DEFAULT: 'var(--color-error)',   soft: 'var(--color-error-soft)' },
        neutral: { DEFAULT: 'var(--color-neutral)', soft: 'var(--color-neutral-soft)' },
      },
      // Die Schriftgrade, die das Projekt tatsaechlich benutzt. Tailwinds Standardskala
      // (text-sm = 14px) trifft sie nicht -- 13px ist mit 278 Vorkommen der haeufigste
      // Wert und war deshalb bisher nur als Inline-Style ausdrueckbar. Mit diesen Tokens
      // wird aus style="color:var(--text);font-size:13px;font-weight:600"
      // ein class="text-13 text-body font-semibold".
      fontSize: {
        '10': ['10px', '1.4'],
        '11': ['11px', '1.45'],
        '12': ['12px', '1.45'],
        '13': ['13px', '1.5'],
        '14': ['14px', '1.5'],
        '15': ['15px', '1.5'],
        '16': ['16px', '1.5'],
        '18': ['18px', '1.35'],
        '20': ['20px', '1.3'],
        '22': ['22px', '1.25'],
        '26': ['26px', '1.2'],
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
        'card': 'var(--shadow)',
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
