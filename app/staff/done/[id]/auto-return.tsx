"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * The confirmation is a glance, not a screen to dismiss — staff have a cup in
 * one hand. It returns to the keypad on its own, and a tap gets there sooner.
 */
export function AutoReturn({ after = 1800 }: { after?: number }) {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => router.replace("/staff/lookup"), after);
    return () => clearTimeout(timer);
  }, [router, after]);

  return null;
}
