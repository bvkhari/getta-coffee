import { unstable_cache } from "next/cache";
import { db } from "@/shared/supabase";

export type Scope = "all" | "month";

export type BoardRow = {
  memberId: string;
  name: string;
  stamps: number;
  /** Shared by ties: two members on 40 stamps are both 3rd. */
  position: number;
};

export type Board = {
  rows: BoardRow[];
  /** The viewer's own standing. `position` is 0 when they have none yet. */
  you: { position: number; stamps: number; total: number };
};

export const BOARD_SIZE = 10;

/**
 * The first day of the current month, in the shop's timezone.
 *
 * The server runs in UTC, so on the 1st of the month in Malaysia this would
 * otherwise still be reporting the month that just ended -- for the eight hours
 * that matter most to anyone watching a monthly board reset.
 */
export function currentMonth(): string {
  const ym = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kuala_Lumpur",
    year: "numeric",
    month: "2-digit",
  }).format(new Date());
  return `${ym}-01`;
}

/** Human label for the month a board is showing. */
export function monthLabel(month: string): string {
  return new Date(`${month}T00:00:00Z`).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/**
 * Both halves of a board in one place.
 *
 * Cached briefly rather than tagged: a leaderboard changes whenever anyone in
 * the shop is stamped, so tagging it would mean every stamp busting every
 * customer's cache. Half a minute stale is invisible on a ranking and saves the
 * database from a full aggregate on every page view.
 */
export function getBoard(memberId: string, scope: Scope): Promise<Board> {
  const month = scope === "month" ? currentMonth() : null;

  return unstable_cache(
    async (): Promise<Board> => {
      const [board, mine] = await Promise.all([
        db().rpc("leaderboard", { p_month: month, p_limit: BOARD_SIZE }),
        db().rpc("leaderboard_position", { p_member: memberId, p_month: month }),
      ]);

      if (board.error) throw board.error;
      if (mine.error) throw mine.error;

      const standing = (mine.data as unknown as Board["you"][])[0];

      return {
        rows: (board.data as unknown as BoardRow[]).map((row) => ({
          memberId: (row as unknown as { member_id: string }).member_id,
          name: row.name,
          stamps: Number(row.stamps),
          position: Number(row.position),
        })),
        you: {
          position: Number(standing?.position ?? 0),
          stamps: Number(standing?.stamps ?? 0),
          total: Number(standing?.total ?? 0),
        },
      };
    },
    // The member id is in the key because "you" differs per viewer, even though
    // the rows do not.
    ["leaderboard", scope, month ?? "all", memberId],
    { revalidate: 30 },
  )();
}
