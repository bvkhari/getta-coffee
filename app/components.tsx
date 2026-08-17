import { STAMPS_PER_REWARD } from "@/lib/members";

export function Wordmark() {
  return (
    <div className="mark">
      <p className="wordmark">
        GETTA<sup>®</sup>
        <br />
        COFFEE
      </p>
      <p className="eyebrow">Getta Rewards</p>
    </div>
  );
}

export function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="eyebrow">{children}</p>;
}

export function Footer() {
  return <p className="foot">Crafted with Care, Served with Quality</p>;
}

function Bean() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <g transform="rotate(-28 12 12)">
        <ellipse cx="12" cy="12" rx="6.4" ry="9" fill="currentColor" />
        <path
          d="M12 3.6C8.7 7.2 15.3 16.8 12 20.4"
          fill="none"
          stroke="rgba(107,33,24,.55)"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
}

/**
 * Five slots showing progress toward the next free drink. Stamps past the
 * threshold roll over, so a member on 6 sees a full gold card and keeps the
 * spare.
 */
export function Slots({ stamps }: { stamps: number }) {
  const complete = stamps >= STAMPS_PER_REWARD;
  const filled = complete ? STAMPS_PER_REWARD : stamps % STAMPS_PER_REWARD;

  return (
    <div className="slots">
      {Array.from({ length: STAMPS_PER_REWARD }, (_, i) => (
        <div
          key={i}
          className={
            i < filled ? `slot filled${complete ? " gold" : ""}` : "slot"
          }
        >
          {i < filled ? <Bean /> : null}
        </div>
      ))}
    </div>
  );
}

export function Progress({
  stamps,
  redeemed = 0,
}: {
  stamps: number;
  /** Past redemptions — an existing member is owed a "next", not a "first". */
  redeemed?: number;
}) {
  if (stamps >= STAMPS_PER_REWARD) {
    return (
      <p className="progress">
        <em>Free drink ready.</em>
      </p>
    );
  }
  if (stamps === 0) {
    return (
      <p className="progress">
        <em>{STAMPS_PER_REWARD} receipts</em> to your{" "}
        {redeemed > 0 ? "next" : "first"} free drink.
      </p>
    );
  }
  const left = STAMPS_PER_REWARD - stamps;
  return (
    <p className="progress">
      <em>{left} more</em> {left === 1 ? "receipt" : "receipts"} to a free drink.
    </p>
  );
}

export function formatVisit(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
