/* ============================================================================
 * Live preview bridge — Theme Editor ⇄ storefront iframe
 *
 * The editor posts the *unsaved* settings object into the preview iframe on
 * every keystroke. The storefront listens and swaps its settings in memory,
 * so the merchant sees the change instantly without a save or a reload.
 *
 * Nothing here touches the database — Save still does the real PUT.
 * ========================================================================== */

export const PREVIEW_MSG = 'hushae:preview-settings';
export const PREVIEW_SELECT = 'hushae:preview-select';
export const PREVIEW_READY = 'hushae:preview-ready';

/** True when the storefront is running inside the Theme Editor iframe. */
export function isPreview() {
  if (typeof window === 'undefined') return false;
  try {
    return window.self !== window.top
      && new URLSearchParams(window.location.search).get('preview') === '1';
  } catch {
    return false;
  }
}

/** Editor → iframe: push the current (possibly unsaved) settings. */
export function pushPreview(iframe, settings) {
  try {
    iframe?.contentWindow?.postMessage({ type: PREVIEW_MSG, settings }, '*');
  } catch { /* cross-origin — ignore */ }
}

/** Editor → iframe: highlight + scroll to a section. */
export function pushSelect(iframe, sectionId) {
  try {
    iframe?.contentWindow?.postMessage({ type: PREVIEW_SELECT, sectionId }, '*');
  } catch { /* ignore */ }
}

/** iframe → editor: announce that the preview is mounted and listening. */
export function announceReady() {
  try {
    window.parent?.postMessage({ type: PREVIEW_READY }, '*');
  } catch { /* ignore */ }
}
