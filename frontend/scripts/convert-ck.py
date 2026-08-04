#!/usr/bin/env python3
"""Convert the remaining storefront files from the OLD hardcoded palette
(#0E0E0E / #6E6E6B / #E3E2DF / #F7F6F4 + Archivo) to the CK design-system
tokens (obsidian / ash / line / alabaster + Helvetica CK stack).

Two kinds of replacement:
  1. Tailwind arbitrary classes: text-[#0E0E0E] -> text-obsidian, etc.
     (replace the bracketed token with the token name — the {prop}-{color}
     utility shape is preserved for every prefix: bg-, border-, from-, …)
  2. Inline style hex strings: '#0E0E0E' -> '#111111' (the token's value),
     and the Archivo fontFamily -> the CK Helvetica stack.
"""
import re, sys

FILES = [
    'pages/Shop.jsx', 'pages/Sale.jsx', 'pages/Blog.jsx', 'pages/BlogPost.jsx',
    'pages/FitFinder.jsx', 'pages/BundleBuilder.jsx', 'pages/FabricTech.jsx',
    'pages/NotFound.jsx', 'components/ProductCard.jsx', 'components/QuickView.jsx',
    'components/FitScale.jsx', 'components/SearchOverlay.jsx',
    'components/CountrySelector.jsx', 'components/BlogMarkdown.jsx',
]

# bracketed token -> tailwind color name
BRACKET = {
    '#0E0E0E': 'obsidian',
    '#6E6E6B': 'ash',
    '#E3E2DF': 'line',
    '#F7F6F4': 'alabaster',
    '#F0EFEC': 'satin',
}
# inline hex string -> token value
INLINE = {
    '#0E0E0E': '#111111',
    '#6E6E6B': '#6E6760',
    '#E3E2DF': '#E4DED4',
    '#F7F6F4': '#F7F5F1',
    '#F0EFEC': '#E4DDD3',
}
ARCHIVO = "'Archivo', system-ui, -apple-system, sans-serif"
ARCHIVO2 = "'Archivo', system-ui, sans-serif"
CK_STACK = "'Family Klein', 'Helvetica Neue', Helvetica, Arial, sans-serif"

total = 0
for f in FILES:
    try:
        s = open(f, encoding='utf-8').read()
    except FileNotFoundError:
        print(f'  SKIP (missing): {f}')
        continue
    orig = s
    # 1. Tailwind arbitrary classes — replace bracketed token (case-insensitive)
    for hexv, name in BRACKET.items():
        # matches [<hex>] exactly (the brackets)
        s = re.sub(r'\[' + re.escape(hexv) + r'\]', name, s, flags=re.IGNORECASE)
    # 2. Inline style hex strings (still-quoted leftovers)
    for hexv, val in INLINE.items():
        s = s.replace(f"'{hexv}'", f"'{val}'").replace(f'"{hexv}"', f'"{val}"')
    # 3. Archivo font stack -> CK Helvetica
    s = s.replace(ARCHIVO, CK_STACK).replace(ARCHIVO2, CK_STACK)
    if s != orig:
        open(f, 'w', encoding='utf-8').write(s)
        n = sum(1 for a, b in zip(orig, s) if a != b)
        total += n
        print(f'  CHANGED: {f}')
    else:
        print(f'  ok:      {f}')
print(f'\nTotal edits: {total}')
