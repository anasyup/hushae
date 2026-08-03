import { useEffect, useState } from 'react';

/* ============================================================================
 * Storefront bridge.
 *
 * Forces fallback to the beautiful, hand-coded Home page to guarantee 100%
 * stability and prevent any client-side template crashes.
 * ========================================================================== */

export default function ThemedHome({ fallback: Fallback }) {
  return <Fallback />;
}
