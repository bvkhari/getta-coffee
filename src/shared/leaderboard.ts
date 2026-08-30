import { unstable_cache } from "next/cache";
import { db } from "@/shared/supabase";

export type BoardRow = {
  memberId: string;
  name: string;
  stamps: number;
  /**
   * Unique to this member. Equal totals are separated by who reached that
   * total first, so nobody shares a place and the order never wobbles.
   */
  position: number;
};

export type Board = {
  rows: BoardRow[];
  /** The viewer's own standing. `position` is 0 when they have none yet. */
  you: { position: number; stamps: number; total: number };
};

export const BOARD_SIZE = 10;

/**
 * Both halves of a board in one place.
 *
 * Cached briefly rather than tagged: a leaderboard changes whenever anyone in
 * the shop is stamped, so tagging it would mean every stamp busting every
 * customer's cache. Half a minute stale is invisible on a ranking and saves the
 * database from a full aggregate on every page view.
 */
export function getBoard(memberId: string): Promise<Board> {
  return unstable_cache(
    async (): Promise<Board> => {
      const [board, mine] = await Promise.all([
        db().rpc("leaderboard", { p_limit: BOARD_SIZE }),
        db().rpc("leaderboard_position", { p_member: memberId }),
      ]);

      if (board.error) throw board.error;
      if (mine.error) throw mine.error;

      // The SQL column is "standing", not "position": the latter is reserved
      // in Postgres. The rename stops at this boundary.
      const standing = (
        mine.data as unknown as { standing: number; stamps: number; total: number }[]
      )[0];

      return {
        rows: (
          board.data as unknown as {
            member_id: string;
            name: string;
            stamps: number;
            standing: number;
          }[]
        ).map((row) => ({
          memberId: row.member_id,
          name: row.name,
          stamps: Number(row.stamps),
          position: Number(row.standing),
        })),
        you: {
          position: Number(standing?.standing ?? 0),
          stamps: Number(standing?.stamps ?? 0),
          total: Number(standing?.total ?? 0),
        },
      };
    },
    // The member id is in the key because "you" differs per viewer, even though
    // the rows do not.
    ["leaderboard", memberId],
    { revalidate: 30 },
  )();
}
