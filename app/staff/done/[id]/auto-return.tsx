"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Staff are holding a cup in one hand, so the confirmation returns to the
 * keypad on its own. Tapping through gets there sooner.
 */
export function AutoReturn({ after = 1800 }: { after?: number }) {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => router.replace("/staff/lookup"), after);
    return () => clearTimeout(timer);
  }, [router, after]);

  return null;
}
