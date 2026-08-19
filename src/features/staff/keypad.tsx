"use client";

import { useActionState, useState } from "react";
import { lookUp, type StaffState } from "@/features/staff/actions";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

export function Keypad() {
  const [phone, setPhone] = useState("");
  const [state, action, pending] = useActionState(lookUp, {} as StaffState);

  const press = (digit: string) =>
    setPhone((current) => (current.length < 15 ? current + digit : current));

  const clear = () => setPhone("");
  const backspace = () => setPhone((current) => current.slice(0, -1));

  /**
   * Keys fire on pointer-down, not click.
   *
   * On a phone, two taps in quick succession get arbitrated as a double-tap
   * zoom: the browser holds the first click back while it waits, and drops the
   * second. Typing a phone number at any speed skipped digits. Acting on
   * pointer-down registers each tap the instant it lands, and `touch-action:
   * manipulation` in the stylesheet tells the browser there is no zoom gesture
   * to wait for.
   *
   * Keyboards get their own handler, since there is no click handler left to
   * carry Enter and Space.
   */
  function keyHandlers(run: () => void) {
    return {
      onPointerDown: (event: React.PointerEvent) => {
        // Primary button only, so a right-click can't type a digit.
        if (event.button !== 0) return;
        run();
      },
      onKeyDown: (event: React.KeyboardEvent) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          run();
        }
      },
    };
  }

  return (
    <form action={action}>
      <input type="hidden" name="phone" value={phone} />

      <p className="eyebrow" style={{ textAlign: "center", marginTop: 26 }}>
        Customer phone number
      </p>
      <p
        className={phone ? "readout" : "readout empty"}
        aria-live="polite"
        aria-label={
          phone ? `Entered ${phone.split("").join(" ")}` : "No number entered"
        }
      >
        {phone || "Tap the keypad"}
      </p>

      <div className="pad">
        {KEYS.map((key) => (
          <button key={key} type="button" {...keyHandlers(() => press(key))}>
            {key}
          </button>
        ))}
        <button type="button" className="util" {...keyHandlers(clear)}>
          CLEAR
        </button>
        <button type="button" {...keyHandlers(() => press("0"))}>
          0
        </button>
        <button type="button" className="util" {...keyHandlers(backspace)}>
          DELETE
        </button>
      </div>

      <p className="err" role="alert">
        {state.error ?? ""}
      </p>

      <div className="stack">
        <button className="btn big" type="submit" disabled={pending}>
          {pending ? "LOOKING UP…" : "FIND CUSTOMER"}
        </button>
      </div>
    </form>
  );
}
