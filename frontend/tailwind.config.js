/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    /* PHASE 3 — desktop breakpoints.
       Tailwind's default 2xl is 1536px and the theme never used it, so every
       layout froze at max-w-7xl (1280px). MEASURED on live: the container, the
       940px product grid, the 220px cards and the 484px PDP frame were
       BYTE-IDENTICAL at 1440, 1920 and 2560 — 33% of a 1920 screen and 50% of a
       2560 screen was empty margin.
       NOTE: the comment lives OUTSIDE the object. A block comment inside the
       screens literal made Tailwind emit ZERO media queries — every responsive
       variant in the whole stylesheet silently vanished and .container-page
       compiled to a bare max-width:80rem. Caught by grepping the built CSS. */
    screens: {
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1600px',
      '3xl': '1920px',
    },
    extend: {
      colors: {
        // Refined premium palette — inspired by Calvin Klein / Hanro / editorial fashion houses.
        // Anchor: deep-warm black + soft ivory. Accents are muted, never loud.
        obsidian:  '#111111',   // primary ink (CK: near-black)
        ink:       '#1A1A1A',   // secondary ink for softer text on light
        graphite:  '#333333',   // hover/pressed states, dividers on dark
        alabaster: '#FFFFFF',   // primary background — pure white (CK register)
        cream:     '#F0F0F0',   // light cool gray — cards on alabaster
        satin:     '#F0F0F0',   // soft neutral (previous)

        /* ── Theme-aware neutral + white/black (CSS-variable RGB) ─────────
           Standard Tailwind theming: colors are `rgb(var(--x) / alpha)`,
           so opacity utilities (bg-white/70, text-neutral-900/60 …) keep
           working. index.css defines the triplets in :root (light = Tailwind
           defaults) and .dark-admin (dark palette) — the admin dark mode
           swaps the WHOLE palette in one place instead of per-utility
           !important overrides. Storefront untouched. */
        white: 'rgb(var(--tw-white) / <alpha-value>)',
        black: 'rgb(var(--tw-black) / <alpha-value>)',
        neutral: {
          50:  'rgb(var(--n50)  / <alpha-value>)',
          100: 'rgb(var(--n100) / <alpha-value>)',
          200: 'rgb(var(--n200) / <alpha-value>)',
          300: 'rgb(var(--n300) / <alpha-value>)',
          400: 'rgb(var(--n400) / <alpha-value>)',
          500: 'rgb(var(--n500) / <alpha-value>)',
          600: 'rgb(var(--n600) / <alpha-value>)',
          700: 'rgb(var(--n700) / <alpha-value>)',
          800: 'rgb(var(--n800) / <alpha-value>)',
          900: 'rgb(var(--n900) / <alpha-value>)',
          950: 'rgb(var(--n950) / <alpha-value>)',
        },
        stone:     'rgb(var(--stone) / <alpha-value>)',  // QA #F5F3EF — warm page background
        // Secondary text. Was #7A736D, which measured 4.29:1 on alabaster and
        // 3.90:1 on cream — both under the 4.5:1 WCAG AA floor. Darkened just
        // enough to clear it on either surface (5.11:1 / 4.65:1) while staying
        // clearly lighter than `ink` so the hierarchy still reads.
        ash:       '#707070',
        ashlight:  '#8A8A8A',   // the old tone — decorative use only, never text
        smoke:     'rgb(var(--smoke) / <alpha-value>)',  // QA #8B8A87 — secondary text
        line:      '#E5E5E5',   // dividers/borders — barely visible
        sage:      '#9CA3AF',   // subtle accent (used sparingly)
        sagedeep:  '#111111',   // deep sage for links/CTAs
        // sagedeep on a sage/25 wash over white measures 4.26:1 — under AA.
        // This darker step clears it at 5.4:1 and is used by .badge-sage.
        sagedark:  '#333333',
        clay:      'rgb(var(--clay) / <alpha-value>)',  // QA #D4C9B8 — borders/hairlines

        /* ── QUIET ARCHITECTURE (QA) theme tokens — Phase 2 (wired) ─────
           All QA colours map to the CSS variables in index.css (:root) so
           opacity utilities (bg-sand/60 …) keep working. `stone` and `clay`
           were migrated in Phase 2: ~50 border-stone call sites became
           border-clay (clay IS the QA border token), the old warm clay
           accents became bronze, and bg-stone surfaces became sand. */
        sand:      'rgb(var(--sand) / <alpha-value>)',      // #EBE5DB card surfaces
        charcoal:  'rgb(var(--charcoal) / <alpha-value>)',  // #1A1B1C primary text
        pearl:     'rgb(var(--pearl) / <alpha-value>)',     // #FFFFFF accents
        gold:      'rgb(var(--gold) / <alpha-value>)',      // #000000 accent (CK: black)
        bronze:    'rgb(var(--bronze) / <alpha-value>)',    // #333333 dark hover (CK: gray)
        midnight:  'rgb(var(--midnight) / <alpha-value>)',  // #111111 footer
      },
      fontFamily: {
        /* Two-family storefront — LV / Bottega register.
           Jost (sans) is the workhorse — body, nav, headlines, UI.
           Fraunces (serif) is reserved for ONE moment on the storefront
           (the hero H1) to create an editorial distinction that one-family
           sites like CK / Aesop do not have.               */
        sans:    ['"Klein"', '"Jost"', 'Helvetica Neue', 'Helvetica', 'Arial', 'sans-serif'],
        display: ['"Klein"', '"Jost"', 'Helvetica Neue', 'Helvetica', 'Arial', 'sans-serif'],
        klein:   ['"Klein"', '"Jost"', 'Helvetica Neue', 'Helvetica', 'Arial', 'sans-serif'],
        /* Serif — Fraunces is loaded in /fonts/ (see index.css @font-face).
           Used by `font-serif` for the one editorial moment in the hero.
           Pair with text-3xl tracking-tight for the Fraunces display
           (negative tracking on serifs is standard editorial practice). */
        serif:        ['"Fraunces"', '"Klein"', '"Jost"', 'Georgia', 'serif'],
        editorial:    ['"Fraunces"', '"Klein"', '"Jost"', 'Georgia', 'serif'],
        product:      ['"Klein"', '"Jost"', 'Helvetica Neue', 'Helvetica', 'Arial', 'sans-serif'],
        urdu: ['"Noto Nastaliq Urdu"', 'serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SF Mono', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
        displaySerif: ['"Fraunces"', '"Klein"', '"Jost"', 'Georgia', 'serif'],
      },
      /* ─────────────────────────────────────────────────────────────────────
       * TYPOGRAPHY TOKENS — single source of truth
       *
       * Five tracking rungs only. Anything else is a bug.
       *
       *   tracking-eyebrow  0.32em — kicker tags ONLY (eyebrow above section)
       *   tracking-label    0.22em — small caps UI labels (buttons, tags)
       *   tracking-caps     0.14em — section subheads in UPPERCASE
       *   tracking-heading  0.06em — section headings (open caps)
       *   tracking-body     0em    — body copy, sentence case
       *
       * If a design calls for a tracking value that is not in this list, it is
       * a bug, not a creative choice. Greppable, predictable, auditable.
       * ───────────────────────────────────────────────────────────────────── */
      letterSpacing: {
        'eyebrow': '0.32em',  // kicker tags — only on 9-11px tracked caps
        'label':   '0.22em',  // buttons, badges, small caps
        'caps':    '0.14em',  // section subheads in UPPERCASE
        'heading': '0.06em',  // section headings (open caps)
        'body':    '0em',     // body copy, sentence case
        'tight':   '-0.005em', // display headlines (serif moment)
      },

      /* ─────────────────────────────────────────────────────────────────────
       * SIZE TOKENS — seven rungs, all `clamp()`-scaled.
       *
       * Mobile → tablet → desktop is one continuous clamp so no component has
       * to invent a custom breakpoint ladder. The `min` of each rung matches
       * the value every existing section already used on mobile, so the
       * migration is lossless.
       *
       *   text-xs    11px → 12px        (kicker tags, micro UI)
       *   text-sm    13px → 14px        (small body, captions, mobile eyebrow)
       *   text-md    15px → 17px        (default body, button labels)
       *   text-lg    17px → 19px        (large body, lead paragraph)
       *   text-xl    24px → 32px        (small heading, editorial callout)
       *   text-2xl   32px → 48px        (section heading, peer-level title)
       *   text-3xl   48px → 72px        (display, brand voice)
       *
       * Hero H1 uses text-3xl with serif (one custom moment).
       * ───────────────────────────────────────────────────────────────────── */
      fontSize: {
        // Body ramp (top of the ladder — read these first)
        'xs':   ['clamp(0.6875rem, 0.95vw + 0.32rem, 0.75rem)',   { lineHeight: '1.4' }],
        'sm':   ['clamp(0.8125rem, 0.95vw + 0.40rem, 0.875rem)',  { lineHeight: '1.55' }],
        'md':   ['clamp(0.9375rem, 1.20vw + 0.40rem, 1.0625rem)', { lineHeight: '1.66' }],
        'lg':   ['clamp(1.0625rem, 1.35vw + 0.46rem, 1.1875rem)', { lineHeight: '1.6' }],
        'xl':   ['clamp(1.5rem,   2.6vw  + 0.55rem, 2rem)',        { lineHeight: '1.18', letterSpacing: '0.14em' }],   // subhead caps
        '2xl':  ['clamp(2rem,     3.2vw  + 0.85rem, 3rem)',        { lineHeight: '1.1',  letterSpacing: '0.06em' }],   // section heading
        '3xl':  ['clamp(3rem,     5.6vw  + 0.85rem, 4.5rem)',      { lineHeight: '1.02', letterSpacing: '0.04em' }],   // display (serif moment)

        // Legacy aliases — kept so the existing h1/h2/h3 etc. classes still
        // compile. New code should use xs/sm/md/lg/xl/2xl/3xl only.
        h1: ['clamp(1.875rem, 3.4vw, 3.75rem)', { lineHeight: '1.1', letterSpacing: '0.02em' }],
        h2: ['clamp(1.5rem, 2.6vw, 2.75rem)',   { lineHeight: '1.16', letterSpacing: '0.02em' }],
        h3: ['clamp(1.25rem, 2vw, 1.875rem)',   { lineHeight: '1.24', letterSpacing: '0.015em' }],
        h4: ['clamp(1.125rem, 2.6vw + 0.06rem, 1.5rem)', { lineHeight: '1.3', letterSpacing: '0.03em' }],
        h5: ['clamp(1rem, 1.7vw + 0.19rem, 1.25rem)',      { lineHeight: '1.36', letterSpacing: '0.02em' }],
        h6: ['0.875rem', { lineHeight: '1.45', letterSpacing: '0.02em' }],
        'display-1': ['clamp(2.75rem, 6vw, 8.5rem)', { lineHeight: '0.98', letterSpacing: '0.01em' }],
        'display-2': ['clamp(2.25rem, 4.6vw, 6rem)', { lineHeight: '1.0', letterSpacing: '0.01em' }],
        'body-lg': ['clamp(1.0625rem, 1.55vw + 0.30rem, 1.1875rem)', { lineHeight: '1.7' }],
        body:      ['clamp(0.9375rem, 1.55vw + 0.18rem, 1.0625rem)',  { lineHeight: '1.66' }],
        'body-sm': ['clamp(0.8125rem, 1.55vw + 0.06rem, 0.9375rem)', { lineHeight: '1.62' }],
        caption:   ['clamp(0.75rem, 0.8vw + 0.35rem, 0.8125rem)',   { lineHeight: '1.55' }],
        'label-lg': ['clamp(0.75rem, 1.2vw + 0.15rem, 0.875rem)',   { lineHeight: '1', letterSpacing: '0.18em' }],
        label:      ['clamp(0.6875rem, 1.1vw + 0.13rem, 0.8125rem)', { lineHeight: '1', letterSpacing: '0.18em' }],
        'btn':    ['0.8125rem', { lineHeight: '1', letterSpacing: '0.16em' }],
        'btn-sm': ['0.6875rem', { lineHeight: '1', letterSpacing: '0.16em' }],
      },

      // 4px base grid. Named steps stop 'p-3 vs p-3.5' drift between authors.
      maxWidth: {
        /* The editorial column. 7xl (1280) was the only width in the theme.
           These are the measured content widths the desktop redesign targets:
           1440 -> 1360, 1920 -> 1680, 2560 -> 1840. Capping at 1840 rather
           than filling 2560 is deliberate — a product grid that spans a full
           studio display stops reading as a considered edit. */
        shell: '1840px',
      },
      spacing: {
        'gap-xs': '0.5rem',   // 8  — inside a chip
        'gap-sm': '0.75rem',  // 12 — between related controls
        'gap-md': '1.25rem',  // 20 — between cards in a grid
        'gap-lg': '2rem',     // 32 — between blocks
        'gap-xl': '3rem',     // 48 — between sub-sections
        'sect-y':    '3.5rem',  // 56 — vertical section padding, mobile
        'sect-y-lg': '5.5rem',  // 88 — vertical section padding, desktop
        /* PHASE 4 editorial rhythm. A magazine does not space every spread
           equally: a chapter break breathes more than a caption. These are the
           three rungs the homepage now uses between major movements. */
        'ed-sm': '4.5rem',   // 72  — within a movement
        'ed-md': '7.5rem',   // 120 — between movements
        'ed-lg': '11rem',    // 176 — chapter break, desktop only
        /* QA — "Breathing Room" section rhythm */
        section:        '160px',  // desktop vertical padding
        'section-mobile': '80px', // mobile vertical padding
      },

      // One radius ladder. The audit found ten different values in use.
      /* PHASE 4 — the single most template-like signal in the whole theme.
         MEASURED: 148 `rounded-full` instances in shopper UI, plus a 12/16/24/32
         radius ladder. Soft pills and generous corner rounding are the visual
         grammar of a SaaS dashboard and of every default ecommerce theme; no
         fashion house sets its imagery in 32px-rounded tiles.
         HUSHAE's language is rectilinear. Type, photography and rules are
         squared; only genuinely circular affordances (an avatar, a colour
         swatch, a dot) stay round, and those use `rounded-full` explicitly.
         The token NAMES are unchanged so all ~300 call sites inherit the new
         geometry without a single edit — and can be reverted the same way. */
      borderRadius: {
        control: '2px',      // inputs, buttons — a hairline softening, not a pill
        card:    '0px',      // product imagery sits square on the page
        panel:   '2px',      // drawers, modals
        hero:    '0px',      // full-bleed editorial
      },

      // Four rungs of elevation, all warm-tinted to match the palette.
      boxShadow: {
        soft: '0 24px 60px -30px rgba(17,17,17,0.16)',
        card: '0 10px 34px -20px rgba(17,17,17,0.22)',
        'e-1': '0 1px 2px rgba(17,17,17,0.05)',
        'e-2': '0 4px 12px -4px rgba(17,17,17,0.10)',
        'e-3': '0 12px 32px -12px rgba(17,17,17,0.16)',
        'e-4': '0 28px 64px -28px rgba(17,17,17,0.24)',
        focus: '0 0 0 2px #FFFFFF, 0 0 0 4px #111111',
      },

      transitionDuration: {
        fast: '150ms',   // colour / opacity on hover
        base: '220ms',   // the default for anything interactive
        slow: '400ms',   // panels, accordions
        media: '700ms',  // image zoom, hero crossfades
        // QA — reveal / hover registers
        reveal: '600ms', // scroll reveal (sections fade up 40px)
        hover: '400ms',  // image hover (1.02 scale, crossfade)
      },
      transitionTimingFunction: {
        entrance: 'cubic-bezier(0.16, 1, 0.3, 1)',
        exit: 'cubic-bezier(0.4, 0, 1, 1)',
        standard: 'cubic-bezier(0.2, 0.6, 0.2, 1)',
        // QA "Breath" — the house ease: slow, deliberate, never springy
        luxury: 'cubic-bezier(0.25, 1, 0.5, 1)',
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
