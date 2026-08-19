"use client";

import { useEffect, useRef, useState } from "react";
import { redeem } from "@/features/staff/actions";

/**
 * Redeeming consumes five stamps and cannot be undone, and this button lands in
 * the same spot `+1 STAMP` occupies the rest of the time — so a stamping reflex
 * would fire it. The first tap only arms it; the second commits. It disarms
 * itself after a few seconds so it never stays hot between customers.
 */
export function RedeemButton({ memberId }: { memberId: string }) {
  const [armed, setArmed] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  return (
    <form action={redeem}>
      <input type="hidden" name="memberId" value={memberId} />
      <button
        className={armed ? "btn stop big" : "btn gold big"}
        type="submit"
        onClick={(event) => {
          if (armed) return;
          event.preventDefault();
          setArmed(true);
          if (timer.current) clearTimeout(timer.current);
          timer.current = setTimeout(() => setArmed(false), 4000);
        }}
      >
        {armed ? "TAP AGAIN TO CONFIRM" : "REDEEM FREE DRINK"}
      </button>
      {armed ? (
        <p className="center-note">Uses 5 stamps. This can&rsquo;t be undone.</p>
      ) : null}
    </form>
  );
}
