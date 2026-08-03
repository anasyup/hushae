import { useEffect, useRef, useState } from 'react';

/**
 * Keeps a merchant-editable menu from ever breaking the bar.
 *
 * Degrades in four steps: centred at the chosen spacing → centred but
 * tightened → flowed next to the logo (which unlocks the empty half of the
 * bar) → hamburger.
 *
 * Two things make this converge that are easy to get wrong:
 *  · the link width is summed from the children, never derived from
 *    scrollWidth minus the current gap — that self-reference oscillates;
 *  · the icon width is computed from settings, not the DOM, because
 *    collapsing hides two icons and would otherwise flip the decision back.
 */
export default function useNavFit({ navRef, logoRef, menuKey, navGap, navSize, navUpper, iconCount }) {
  const [fitGap, setFitGap] = useState(null);
  const [flowLeft, setFlowLeft] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const lastContent = useRef(0);

  useEffect(() => {
    lastContent.current = 0;

    const measure = () => {
      const el = navRef.current;
      if (!el || window.innerWidth < 1024) {
        setCollapsed(false); setFitGap(null); setFlowLeft(false);
        return;
      }
      const kids = [...el.children];
      if (kids.length < 2) { setFitGap(null); setCollapsed(false); setFlowLeft(false); return; }

      const live = kids.reduce((sum, k) => sum + k.getBoundingClientRect().width, 0);
      if (live > 0) lastContent.current = live;
      const content = live > 0 ? live : lastContent.current;
      if (!content) return;

      const pad = 80;                                  // px-10 on both sides
      const iconsW = 12 + iconCount * 44;
      const logoW = logoRef.current?.offsetWidth || 0;
      const slots = kids.length - 1;

      const centreRoom = window.innerWidth - pad - Math.max(logoW, iconsW) * 2 - 48;
      if (content + slots * navGap <= centreRoom) { setFitGap(null); setFlowLeft(false); setCollapsed(false); return; }

      const gCentre = Math.floor((centreRoom - content) / slots);
      if (gCentre >= 18) { setFitGap(Math.min(navGap, gCentre)); setFlowLeft(false); setCollapsed(false); return; }

      const flowRoom = window.innerWidth - pad - logoW - iconsW - 72;
      if (content + slots * navGap <= flowRoom) { setFitGap(null); setFlowLeft(true); setCollapsed(false); return; }
      const gFlow = Math.floor((flowRoom - content) / slots);
      if (gFlow >= 14) { setFitGap(Math.min(navGap, gFlow)); setFlowLeft(true); setCollapsed(false); return; }

      setFitGap(14); setFlowLeft(false); setCollapsed(true);
    };

    measure();
    const t = setTimeout(measure, 400);                          // after webfonts land
    if (document.fonts?.ready) document.fonts.ready.then(measure).catch(() => {});
    window.addEventListener('resize', measure);
    return () => { clearTimeout(t); window.removeEventListener('resize', measure); };
  }, [navRef, logoRef, menuKey, navGap, navSize, navUpper, iconCount]);

  return { fitGap, flowLeft, collapsed };
}
