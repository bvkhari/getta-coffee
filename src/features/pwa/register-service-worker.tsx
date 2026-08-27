"use client";

import { useEffect } from "react";

/**
 * Registers the offline fallback worker.
 *
 * Failures are swallowed on purpose. The worker only supplies an offline page
 * and Chrome's install prompt, so a browser that refuses it still has a fully
 * working app, and there is nothing useful to tell the customer.
 */
export function RegisterServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);

  return null;
}
