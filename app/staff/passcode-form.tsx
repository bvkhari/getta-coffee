"use client";

import { useActionState } from "react";
import { unlock, type StaffState } from "./actions";

export function PasscodeForm() {
  const [state, action, pending] = useActionState(unlock, {} as StaffState);

  return (
    <form className="fields" action={action} style={{ padding: 0 }}>
      <label className="f">
        Staff passcode
        <input
          className="t"
          type="password"
          name="passcode"
          inputMode="numeric"
          autoComplete="off"
          autoFocus
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
