"use client";

import { useActionState, useState } from "react";
import { join, logIn, type FormState } from "./actions";

const empty: FormState = {};

export function EntryForm() {
  const [tab, setTab] = useState<"join" | "login">("join");
  const [prefill, setPrefill] = useState("");
  const [joinState, joinAction, joinPending] = useActionState(join, empty);
  const [loginState, loginAction, loginPending] = useActionState(logIn, empty);

  return (
    <div className="sheet">
      <div className="tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "join"}
          onClick={() => setTab("join")}
        >
          JOIN
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "login"}
          onClick={() => setTab("login")}
        >
          MEMBER LOGIN
        </button>
      </div>

      {tab === "join" ? (
        <form className="fields" action={joinAction}>
          <label className="f">
            Full name
            <input
              className="t"
              type="text"
              name="name"
              placeholder="Enter your full name"
              autoComplete="name"
              required
            />
          </label>
          <label className="f">
            Phone number
            <input
              className="t"
              type="tel"
              name="phone"
              placeholder="e.g. 0123456789"
              autoComplete="tel"
              required
            />
          </label>
          <button className="btn" type="submit" disabled={joinPending}>
            {joinPending ? "JOINING…" : "JOIN GETTA REWARDS"}
          </button>
          <p className="err" role="alert">
            {joinState.error ?? ""}
          </p>
          {joinState.takenPhone ? (
            <button
              className="btn ghost"
              type="button"
              onClick={() => {
                setPrefill(joinState.takenPhone ?? "");
                setTab("login");
              }}
            >
              SEE THAT CARD INSTEAD
            </button>
          ) : null}
        </form>
      ) : (
        <form className="fields" action={loginAction}>
          <label className="f">
            Phone number
            <input
              /* Remounts when the join form hands a number over, so the
                 uncontrolled field picks up the new default. */
              key={prefill}
              className="t"
              type="tel"
              name="phone"
              defaultValue={prefill}
              placeholder="e.g. 0123456789"
              autoComplete="tel"
              required
            />
          </label>
          <button className="btn" type="submit" disabled={loginPending}>
            {loginPending ? "CHECKING…" : "SEE MY CARD"}
          </button>
          <p className="err" role="alert">
            {loginState.error ?? ""}
          </p>
        </form>
      )}
    </div>
  );
}
