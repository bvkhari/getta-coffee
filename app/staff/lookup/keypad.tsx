"use client";

import { useActionState, useState } from "react";
import { lookUp, type StaffState } from "../actions";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

export function Keypad() {
  const [phone, setPhone] = useState("");
  const [state, action, pending] = useActionState(lookUp, {} as StaffState);

  const press = (digit: string) =>
    setPhone((current) => (current.length < 15 ? current + digit : current));

  return (
    <form action={action}>
      <input type="hidden" name="phone" value={phone} />

      <p className="eyebrow" style={{ textAlign: "center", marginTop: 26 }}>
        Customer phone number
      </p>
      <p
        className={phone ? "readout" : "readout empty"}
        aria-live="polite"
        aria-label={phone ? `Entered ${phone.split("").join(" ")}` : "No number entered"}
      >
        {phone || "Tap the keypad"}
      </p>

      <div className="pad">
        {KEYS.map((key) => (
          <button key={key} type="button" onClick={() => press(key)}>
            {key}
          </button>
        ))}
        <button type="button" className="util" onClick={() => setPhone("")}>
          CLEAR
        </button>
        <button type="button" onClick={() => press("0")}>
          0
        </button>
        <button
          type="button"
          className="util"
          onClick={() => setPhone((c) => c.slice(0, -1))}
        >
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
