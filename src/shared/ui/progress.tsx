import { STAMPS_PER_REWARD } from "@/shared/members";

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
