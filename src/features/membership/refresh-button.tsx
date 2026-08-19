"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

/**
 * A customer standing at the counter needs to see the stamp the barista just
 * added. router.refresh() re-runs the server component instead of reloading the
 * page, so the scroll position holds and the newly filled slot plays its landing
 * animation rather than the whole card blinking.
 */
export function RefreshButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      className="btn ghost"
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => router.refresh())}
    >
      {pending ? "CHECKING…" : "REFRESH"}
    </button>
  );
}
