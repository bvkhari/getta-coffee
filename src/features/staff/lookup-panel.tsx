"use client";

import { useState } from "react";
import { Keypad } from "@/features/staff/keypad";
import { Scanner } from "@/features/staff/scanner";

/**
 * Scanning is the counter's default; the keypad is one tap away.
 *
 * The fallback is never removed, because the ways a scan fails all happen with
 * a customer already standing there — a flat phone, a cracked screen, someone
 * who never signed in. Typing the number has to stay reachable in one tap.
 */
export function LookupPanel() {
  const [typing, setTyping] = useState(false);

  return (
    <>
      {typing ? <Keypad /> : <Scanner />}

      <p className="center-note" style={{ marginTop: 18 }}>
        <button
          className="link"
          type="button"
          onClick={() => setTyping((current) => !current)}
        >
          {typing ? "Scan a code instead" : "Enter phone number instead"}
        </button>
      </p>
    </>
  );
}
