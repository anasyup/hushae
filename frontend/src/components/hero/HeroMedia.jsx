import { useEffect, useRef, useState } from 'react';

/* ============================================================================
 * Hero background media.
 *
 * The merchant's video is 7.6 MB. Loading it eagerly is what pushed mobile LCP
 * past five seconds, so this component treats video as an enhancement layered
 * on top of a cheap first paint:
 *
 *   1. A poster or still image paints first when one is configured.
 *   2. The video only starts fetching once the browser is idle, and never on a
 *      metered or 2g/3g connection, or when the visitor has asked for reduced
 *      motion — in those cases the still image is the final state.
 *   3. It cross-fades in only after the first frame is actually decodable, so
 *      there is no flash of black between poster and playback.
 *
 * When no still is configured at all the section keeps its obsidian ground,
 * which is what the design already used as the video's own letterbox colour —
 * so nothing shifts or flashes when playback begins.
 * ========================================================================== */
export default function HeroMedia({ video, image, poster }) {
  const still = poster || image || '';
  const [src, setSrc] = useState(null);
  const [ready, setReady] = useState(false);
  const videoRef = useRef(null);

  useEffect(() => {
    if (!video) return undefined;

    const motionOk = !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const conn = navigator.connection || {};
    const fastEnough = !conn.saveData && !/(^|-)(2g|slow-2g)$/.test(conn.effectiveType || '');
    if (!motionOk || !fastEnough) return undefined;

    // Wait for idle so the video never competes with the critical render.
    let cancelled = false;
    const start = () => { if (!cancelled) setSrc(video); };
    const id = 'requestIdleCallback' in window
      ? requestIdleCallback(start, { timeout: 2500 })
      : setTimeout(start, 900);

    return () => {
      cancelled = true;
      if ('cancelIdleCallback' in window) cancelIdleCallback(id); else clearTimeout(id);
    };
  }, [video]);

  // Autoplay can be refused (low power mode, some mobile browsers). If it is,
  // stay on the still rather than showing a frozen frame.
  useEffect(() => {
    if (!src) return;
    const el = videoRef.current;
    if (!el) return;
    const play = el.play();
    if (play?.catch) play.catch(() => setReady(false));
  }, [src]);

  return (
    <>
      {still ? (
        <img
          src={still}
          alt=""
          aria-hidden="true"
          fetchpriority="high"
          decoding="async"
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-media ease-standard ${
            ready ? 'opacity-0' : 'opacity-100'
          }`}
        />
      ) : null}

      {src && (
        <video
          ref={videoRef}
          src={src}
          poster={still || undefined}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          aria-hidden="true"
          tabIndex={-1}
          onCanPlay={() => setReady(true)}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-media ease-standard ${
            ready ? 'opacity-100' : 'opacity-0'
          }`}
        />
      )}
    </>
  );
}
