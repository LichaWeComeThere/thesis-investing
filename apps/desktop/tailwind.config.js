/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/renderer/index.html', './src/renderer/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        pl: {
          page: 'var(--pl-page)',
          canvas: 'var(--pl-canvas)',
          surface: 'var(--pl-surface)',
          card: 'var(--pl-card)',
          muted: 'var(--pl-muted)',
          border: 'var(--pl-border-card)',
          'border-strong': 'var(--pl-border-strong)',
          'border-muted': 'var(--pl-border-muted)',
          'border-divider': 'var(--pl-border-divider)',
          'border-ring': 'var(--pl-border-ring)',
          ink: 'var(--pl-ink)',
          slate: 'var(--pl-slate)',
          mist: 'var(--pl-mist)',
          faint: 'var(--pl-faint)',
          coral: 'var(--pl-coral)',
          coralhover: 'var(--pl-coralhover)',
          coralsoft: 'var(--pl-coralsoft)',
          positive: 'var(--pl-positive)',
          negative: 'var(--pl-negative)',
          teal: 'var(--pl-teal)',
          'teal-deep': 'var(--pl-teal-deep)',
          'teal-muted': 'var(--pl-teal-muted)',
          green: 'var(--pl-green)',
          'green-muted': 'var(--pl-green-muted)',
          overlay: 'var(--pl-overlay)',
          'nav-hover': 'var(--pl-nav-hover)',
          'nav-active': 'var(--pl-nav-active-bg)',
          'nav-active-ring': 'var(--pl-nav-active-ring)',
          'input-focus': 'var(--pl-input-focus-bg)',
          'table-header': 'var(--pl-table-header-bg)',
          'table-row': 'var(--pl-table-row)',
          'table-row-hover': 'var(--pl-table-row-hover)',
          'table-well': 'var(--pl-table-well)',
          'pill-active-bg': 'var(--pl-pill-active-bg)',
          'pill-active-fg': 'var(--pl-pill-active-fg)',
          'pill-idle': 'var(--pl-pill-idle-bg)',
          'pill-idle-hover': 'var(--pl-pill-idle-hover-bg)',
          'risk-from': 'var(--pl-risk-from)',
          'risk-to': 'var(--pl-risk-to)',
          'risk-label': 'var(--pl-risk-label)',
          'risk-pill-bg': 'var(--pl-risk-pill-bg)',
          'risk-pill-text': 'var(--pl-risk-pill-text)',
          'risk-pill-ring': 'var(--pl-risk-pill-ring)',
          'email-from': 'var(--pl-email-grad-from)',
          'email-via': 'var(--pl-email-grad-via)',
          'email-to': 'var(--pl-email-grad-to)',
          'email-panel-from': 'var(--pl-email-panel-grad-from)',
          'email-panel-via': 'var(--pl-email-panel-grad-via)',
          'email-panel-to': 'var(--pl-email-panel-grad-to)',
          'chip-email': 'var(--pl-chip-email-bg)',
          'chip-email-ring': 'var(--pl-chip-email-ring)',
          'profile-ring': 'var(--pl-profile-ring)',
          header: 'var(--pl-header-bg)',
          blue: 'var(--pl-blue)',
          'blue-muted': 'var(--pl-blue-muted)',
          amber: 'var(--pl-amber)',
          'amber-soft': 'var(--pl-amber-soft)',
          'amber-ink': 'var(--pl-amber-ink)'
        }
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.25rem'
      },
      boxShadow: {
        shell: 'var(--pl-shadow-shell)',
        card: 'var(--pl-shadow-card)',
        'card-hover': 'var(--pl-shadow-card-hover)',
        'cta-hero': 'var(--pl-cta-shadow)',
        'cta-email': 'var(--pl-cta-secondary-shadow)'
      },
      transitionDuration: {
        DEFAULT: '200ms'
      },
      transitionTimingFunction: {
        'out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)'
      },
      fontFamily: {
        sans: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'sans-serif'
        ]
      }
    }
  },
  plugins: []
};
