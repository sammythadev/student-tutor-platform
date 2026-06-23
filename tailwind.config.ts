import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        heading: ['Space Grotesk', 'system-ui', '-apple-system', 'sans-serif'],
        sans:    ['DM Sans', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        canvas:   'var(--canvas)',
        surface:  'var(--surface)',
        'surface-2': 'var(--surface-2)',
        sidebar:  'var(--sidebar)',
        primary:  'var(--primary)',
        'primary-hover': 'var(--primary-hover)',
        'primary-fg':    'var(--primary-fg)',
        'primary-subtle':'var(--primary-subtle)',
        accent:   'var(--accent)',
        'accent-hover': 'var(--accent-hover)',
        'accent-fg':    'var(--accent-fg)',
        text: {
          primary:   'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          muted:     'var(--text-muted)',
        },
        border:        'var(--border)',
        'border-strong': 'var(--border-strong)',
        // Subject accent chips
        'accent-lavender': {
          bg: 'var(--accent-lavender-bg)',
          fg: 'var(--accent-lavender-fg)',
        },
        'accent-sky': {
          bg: 'var(--accent-sky-bg)',
          fg: 'var(--accent-sky-fg)',
        },
        'accent-mint': {
          bg: 'var(--accent-mint-bg)',
          fg: 'var(--accent-mint-fg)',
        },
        'accent-sun': {
          bg: 'var(--accent-sun-bg)',
          fg: 'var(--accent-sun-fg)',
        },
        'accent-coral': {
          bg: 'var(--accent-coral-bg)',
          fg: 'var(--accent-coral-fg)',
        },
        'accent-tangerine': {
          bg: 'var(--accent-tangerine-bg)',
          fg: 'var(--accent-tangerine-fg)',
        },
      },
      borderRadius: {
        sm:   '8px',
        md:   '12px',
        lg:   '16px',
        xl:   '20px',
        '2xl':'24px',
        pill: '999px',
      },
      boxShadow: {
        xs:    'var(--shadow-xs)',
        sm:    'var(--shadow-sm)',
        md:    'var(--shadow-md)',
        lg:    'var(--shadow-lg)',
        inset: 'var(--shadow-inset)',
        rest:  'var(--shadow-rest)',
        hover: 'var(--shadow-hover)',
        pop:   'var(--shadow-pop)',
      },
      backdropBlur: {
        panel:   '12px',
        ambient: '28px',
      },
      letterSpacing: {
        tight:   '-0.02em',
        tighter: '-0.03em',
      },
    },
  },
}

export default config
