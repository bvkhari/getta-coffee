"use client";

import { useEffect, useState } from "react";
import { detectPlatform, type Platform } from "@/features/pwa/platform";

type InstallPrompt = Event & { prompt: () => Promise<void> };

/** The iOS Share glyph, drawn rather than described: nobody knows its name. */
function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 15V3" />
      <path d="M8 7l4-4 4 4" />
      <path d="M4 13v6a2 2 0 002 2h12a2 2 0 002-2v-6" />
    </svg>
  );
}

/** Chrome's overflow menu. */
function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true">
      <circle cx="12" cy="5" r="2" />
      <circle cx="12" cy="12" r="2" />
      <circle cx="12" cy="19" r="2" />
    </svg>
  );
}

function steps(platform: Platform): React.ReactNode[] {
  if (platform === "android") {
    return [
      <>
        Tap the <MenuIcon /> menu at the top right of your browser.
      </>,
      <>
        Choose <b>Install app</b> — some versions call it{" "}
        <b>Add to Home screen</b>.
      </>,
      <>
        Confirm with <b>Install</b>. Getta appears with your other apps.
      </>,
    ];
  }

  if (platform === "ios-other-browser") {
    return [
      <>
        Only Safari can add apps to the iPhone home screen, so open this page in{" "}
        <b>Safari</b> first.
      </>,
      <>
        Tap the <ShareIcon /> Share button at the bottom of the screen.
      </>,
      <>
        Scroll down and tap <b>Add to Home Screen</b>, then <b>Add</b>.
      </>,
    ];
  }

  if (platform !== "ios-safari") return [];

  return [
    <>
      Tap the <ShareIcon /> Share button at the bottom of Safari.
    </>,
    <>
      Scroll down the list and tap <b>Add to Home Screen</b>.
    </>,
    <>
      Tap <b>Add</b> at the top right. Getta appears on your home screen.
    </>,
  ];
}

/**
 * Walks a customer, or a barista, through installing the app.
 *
 * The two platforms need opposite treatment. Chrome fires beforeinstallprompt
 * and can install in one tap, so the button is offered first and the written
 * steps are there for the browsers that never fire it. iOS exposes no API at
 * all, so the steps are the only thing available — and without them almost
 * nobody on an iPhone would find the Share menu item.
 *
 * Dismissal is remembered per app, so installing the counter app does not
 * silence the hint on a customer's own phone.
 */
export function InstallHint({ storageKey }: { storageKey: string }) {
  const [deferred, setDeferred] = useState<InstallPrompt | null>(null);
  const [platform, setPlatform] = useState<Platform>(null);
  const [open, setOpen] = useState(false);
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

    const found = detectPlatform(
      navigator.userAgent,
      navigator.platform,
      navigator.maxTouchPoints,
    );

    // Desktop gets nothing. A shortcut on a laptop is not what was asked for,
    // and a tutorial naming buttons that aren't there is worse than silence.
    if (!found) return;

    setPlatform(found);
    setHidden(false);

    const capture = (event: Event) => {
      // Without this Chrome shows its own mini-infobar instead of letting the
      // page choose the moment.
      event.preventDefault();
      setDeferred(event as InstallPrompt);
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
      <div className="installhint-head">
        <div>
          <p className="installhint-title">Keep Getta on your home screen</p>
          <p className="installhint-body">
            Opens straight to your card, with no browser in the way.
          </p>
        </div>

        <div className="installhint-actions">
          {deferred ? (
            <button
              className="btn small"
              type="button"
              onClick={async () => {
                await deferred.prompt();
                // However they answered, the prompt is spent and cannot be
                // reused, so the banner has done its job either way.
                dismiss();
              }}
            >
              ADD
            </button>
          ) : null}
          <button
            className="link"
            type="button"
            onClick={() => setOpen((current) => !current)}
            aria-expanded={open}
          >
            {open ? "Hide steps" : deferred ? "Do it manually" : "Show me how"}
          </button>
        </div>
      </div>

      {open ? (
        <ol className="installsteps">
          {steps(platform).map((step, index) => (
            <li key={index}>{step}</li>
          ))}
        </ol>
      ) : null}

      <button className="link installhint-dismiss" type="button" onClick={dismiss}>
        Not now
      </button>
    </div>
  );
}
