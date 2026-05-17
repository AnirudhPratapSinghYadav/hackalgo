export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: 'var(--bg-primary)',
          surface: 'var(--bg-surface)',
          'surface-secondary': 'var(--bg-surface-secondary)',
          elevated: 'var(--bg-elevated)',
        },
        text: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          tertiary: 'var(--text-tertiary)',
          inverse: 'var(--text-inverse)',
        },
        accent: {
          primary: 'var(--accent-primary)',
          hover: 'var(--accent-hover)',
          deep: 'var(--accent-primary-deep)',
        },
        overlay: {
          dark: 'var(--overlay-dark)',
          darker: 'var(--overlay-darker)',
        },
        alert: {
          critical: 'var(--alert-critical)',
          warning: 'var(--alert-warning)',
          success: 'var(--alert-success)',
          info: 'var(--alert-info)',
        },
        community: {
          upvote: 'var(--community-upvote)',
          downvote: 'var(--community-downvote)',
          verified: 'var(--community-verified)',
          pending: 'var(--community-pending)',
        },
        border: {
          subtle: 'var(--border-subtle)',
          medium: 'var(--border-medium)',
          strong: 'var(--border-strong)',
        },
      },
      fontFamily: {
        serif: ['"Instrument Serif"', 'Georgia', 'serif'],
        sans: ['"Inter Tight"', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      letterSpacing: {
        label: '0.08em',
      },
      maxWidth: {
        editorial: '38rem',
        wide: '72rem',
      },
      width: {
        sidebar: 'var(--sidebar-width)',
      },
      spacing: {
        sidebar: 'var(--sidebar-width)',
      },
    },
  },
  plugins: [],
}
