/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Refined premium palette — inspired by Calvin Klein / Hanro / editorial fashion houses.
        // Anchor: deep-warm black + soft ivory. Accents are muted, never loud.
        obsidian:  '#111111',   // primary ink (slightly warmer than pure #000)
        ink:       '#1A1A1A',   // secondary ink for softer text on light
        graphite:  '#2E2C2A',   // hover/pressed states, dividers on dark
        alabaster: '#F7F5F1',   // primary background — warm ivory (Hanro-style)
        cream:     '#EFEAE3',   // warm off-white — cards on alabaster
        satin:     '#E4DDD3',   // soft neutral (previous)
        stone:     '#C9BFB4',   // mid-tone warm
        ash:       '#7A736D',   // secondary text — warmer than cool grey
        smoke:     '#9C948C',   // muted text on dark
        line:      '#E4DED4',   // dividers/borders — barely visible
        sage:      '#8F9C8B',   // subtle accent (used sparingly)
        sagedeep:  '#5C6A5A',   // deep sage for links/CTAs
        clay:      '#B3927E',   // rare warm accent (badges, sale)
      },
      fontFamily: {
        // Two-family editorial system:
        // - Display: Cormorant Garamond (elegant serif, close to Hanro/CK type)
        // - UI/body: Inter (clean sans, universally legible)
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Cormorant Garamond"', '"Tenor Sans"', 'Didot', 'serif'],
        urdu: ['"Noto Nastaliq Urdu"', 'serif'],
      },
      letterSpacing: {
        widest2: '0.32em',
        wider3:  '0.24em',
      },
      boxShadow: {
        soft: '0 24px 60px -30px rgba(17,17,17,0.16)',
        card: '0 10px 34px -20px rgba(17,17,17,0.22)',
      },
      keyframes: {
        shimmer: { '0%': { backgroundPosition: '-400px 0' }, '100%': { backgroundPosition: '400px 0' } },
        fadeUp:  { '0%': { opacity: 0, transform: 'translateY(12px)' }, '100%': { opacity: 1, transform: 'translateY(0)' } },
      },
      animation: {
        shimmer: 'shimmer 1.6s linear infinite',
        fadeUp:  'fadeUp 0.6s ease-out both',
      },
    },
  },
  plugins: [],
};
