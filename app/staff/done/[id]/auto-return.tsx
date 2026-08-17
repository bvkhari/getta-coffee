"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Staff are holding a cup in one hand, so the confirmation moves on by itself.
 * Tapping a link gets there sooner.
 */
export function AutoReturn({
  to,
  after = 1800,
}: {
  to: string;
  after?: number;
}) {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => router.replace(to), after);
    return () => clearTimeout(timer);
  }, [router, to, after]);

  return null;
}
