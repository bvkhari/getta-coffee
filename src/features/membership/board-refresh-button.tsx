"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

/**
 * The board's own REFRESH, which cannot be the card's.
 *
 * `router.refresh()` re-runs the server component, but `getBoard` is held for
 * 30s, so a plain refresh can hand back the very ranking the tap was meant to
 * escape. Navigating to a URL this click makes unique gets a render the cache
 * is not asked about at all: the page reads straight from Postgres whenever
 * `fresh` is present. `replace` rather than `push` so the back button still
 * goes to the card instead of walking back through every tap.
 */
export function BoardRefreshButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      className="btn ghost"
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(() =>
          router.replace(`/card/leaderboard?fresh=${Date.now()}`, {
            scroll: false,
          }),
        )
      }
    >
      {pending ? "CHECKING…" : "REFRESH"}
    </button>
  );
}
