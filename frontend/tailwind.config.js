/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        obsidian: '#0D0D0D',
        alabaster: '#FBF9F6',
        satin: '#E6DCD2',
        ash: '#69625F',
        sage: '#8F9C8B',
        sagedeep: '#6E7A6A',
        line: '#E7DFD6',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Tenor Sans"', 'Didot', 'serif'],
        urdu: ['"Noto Nastaliq Urdu"', 'serif'],
      },
      letterSpacing: { widest2: '0.35em' },
      boxShadow: {
        soft: '0 20px 50px -24px rgba(13,13,13,0.18)',
        card: '0 8px 30px -18px rgba(13,13,13,0.22)',
      },
      keyframes: {
        shimmer: { '0%': { backgroundPosition: '-400px 0' }, '100%': { backgroundPosition: '400px 0' } },
      },
      animation: { shimmer: 'shimmer 1.6s linear infinite' },
    },
  },
  plugins: [],
};
