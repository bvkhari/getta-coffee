"use client";

import { useRouter } from "next/navigation";
import { useEffect, useTransition } from "react";

/**
 * Re-reads the screen once a minute, and again the moment the app comes back to
 * the foreground.
 *
 * A home-screen app is not a browser tab: the phone keeps the document alive
 * across launches, so a member can be looking at a page rendered hours ago with
 * no reload in sight -- which is how a screen ends up missing a button that has
 * been deployed for an hour. router.refresh() re-runs the server component
 * against the live database, and when the deployment behind it has changed,
 * Next answers the mismatched payload with a full document load, so the app
 * picks up new code the same way.
 *
 * The interval skips while the app is hidden -- a phone in a pocket has no one
 * to show a fresh count to -- and the visibility listener covers the return,
 * which is the moment that actually matters.
 */
export function AutoRefresh({ seconds = 60 }: { seconds?: number }) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  useEffect(() => {
    const refresh = () => {
      if (document.hidden) return;
      startTransition(() => router.refresh());
    };

    const timer = window.setInterval(refresh, seconds * 1000);
    document.addEventListener("visibilitychange", refresh);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [router, seconds]);

  return null;
}
