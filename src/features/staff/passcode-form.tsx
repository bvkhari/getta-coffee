"use client";

import { useActionState, useState } from "react";
import type { Location } from "@/features/staff/locations";
import { unlock, type StaffState } from "@/features/staff/actions";

/**
 * Where this shift is stamping from, picked once at unlock. Every stamp taken
 * before the next Lock inherits it, so nobody chooses a place per customer.
 */
export function PasscodeForm({ places }: { places: Location[] }) {
  const [state, action, pending] = useActionState(unlock, {} as StaffState);
  const [place, setPlace] = useState<Location | null>(null);

  return (
    <form className="fields" action={action} style={{ padding: 0 }}>
      <input type="hidden" name="place" value={place?.name ?? ""} />

      <div className="places">
        {places.map((option) => (
          <button
            key={option.id}
            type="button"
            className={option.name === place?.name ? "on" : undefined}
            onClick={() => setPlace(option)}
          >
            {option.name}
          </button>
        ))}
      </div>

      {place?.asks_event ? (
        <label className="f">
          Event name
          <input
            className="t"
            type="text"
            name="event"
            maxLength={40}
            placeholder="Aidilfitri Bazaar"
            autoComplete="off"
          />
        </label>
      ) : null}

      <label className="f">
        Staff passcode
        <input
          className="t"
          type="password"
          name="passcode"
          inputMode="numeric"
          autoComplete="off"
          required
          style={{ letterSpacing: ".4em", textAlign: "center", fontSize: 20 }}
        />
      </label>
      <button className="btn big" type="submit" disabled={pending}>
        {pending ? "CHECKING…" : "UNLOCK"}
      </button>
      <p className="err" role="alert">
        {state.error ?? ""}
      </p>
    </form>
  );
}
