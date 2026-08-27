"use client";

import { useEffect, useState } from "react";

type InstallPrompt = Event & { prompt: () => Promise<void> };

/**
 * Nudges the customer, or a barista, to install the app.
 *
 * The two platforms need opposite treatment. Chrome fires
 * beforeinstallprompt and lets a button trigger the real installer. iOS Safari
 * fires nothing and offers no API, so all that can be done is tell the person
 * where the button lives — which is why the feature would otherwise go
 * undiscovered by almost everyone on an iPhone.
 *
 * Dismissal is remembered per app, so installing the counter app does not
 * silence the hint on a customer's own phone.
 */
export function InstallHint({ storageKey }: { storageKey: string }) {
  const [deferred, setDeferred] = useState<InstallPrompt | null>(null);
  const [iosSafari, setIosSafari] = useState(false);
  // Starts hidden so the banner never flashes before storage has been read.
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    // Private mode and blocked site data both throw rather than return null.
    try {
      if (localStorage.getItem(storageKey) === "done") return;
    } catch {
      /* treat an unreadable store as "never dismissed" */
    }

    // Already installed: matchMedia covers Android and desktop, navigator
    // .standalone is the iOS-only equivalent Apple never replaced.
    const installed =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (installed) return;

    const ua = navigator.userAgent;
    // iPadOS reports itself as a Mac, and only the touch count gives it away.
    const isIos =
      /iPad|iPhone|iPod/.test(ua) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

    if (isIos) {
      setIosSafari(true);
      setHidden(false);
    }

    const capture = (event: Event) => {
      // Without this Chrome shows its own mini-infobar instead of letting the
      // page choose the moment.
      event.preventDefault();
      setDeferred(event as InstallPrompt);
      setHidden(false);
    };

    window.addEventListener("beforeinstallprompt", capture);
    return () => window.removeEventListener("beforeinstallprompt", capture);
  }, [storageKey]);

  function dismiss() {
    setHidden(true);
    try {
      localStorage.setItem(storageKey, "done");
    } catch {
      /* the banner stays gone for this session either way */
    }
  }

  if (hidden) return null;

  return (
    <div className="installhint" role="note">
      <div>
        <p className="installhint-title">Keep Getta on your home screen</p>
        <p className="installhint-body">
          {deferred
            ? "Opens straight to your card, no browser in the way."
            : "Tap the Share button, then “Add to Home Screen”."}
        </p>
      </div>

      <div className="installhint-actions">
        {deferred ? (
          <button
            className="btn small"
            type="button"
            onClick={async () => {
              await deferred.prompt();
              // Whatever they chose, the prompt is spent and cannot be reused.
              dismiss();
            }}
          >
            ADD
          </button>
        ) : null}
        <button
          className="link"
          type="button"
          onClick={dismiss}
          aria-label="Dismiss install suggestion"
        >
          Not now
        </button>
      </div>
    </div>
  );
}
