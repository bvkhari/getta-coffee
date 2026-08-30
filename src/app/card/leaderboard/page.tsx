import Link from "next/link";
import { redirect } from "next/navigation";
import { currentMember } from "@/shared/members";
import { BOARD_SIZE, fetchBoard, getBoard } from "@/shared/leaderboard";
import { Footer } from "@/shared/ui/footer";
import { Bean } from "@/shared/ui/slots";
import { BoardRefreshButton } from "@/features/membership/board-refresh-button";
import { AutoRefresh } from "@/features/membership/auto-refresh";

export const dynamic = "force-dynamic";

export const metadata = { title: "Leaderboard · Getta Rewards" };

/**
 * Stands in for the avatar the reference design has and this app does not: a
 * member is a name and a phone number, so initials are the only likeness on
 * hand. Two letters where the name gives two, one where it doesn't.
 */
function initials(name: string): string {
  const words = name.trim().split(/\s+/);
  const first = words[0]?.[0] ?? "";
  const last = words.length > 1 ? words[words.length - 1][0] : "";
  return (first + last).toUpperCase();
}

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ fresh?: string }>;
}) {
  const member = await currentMember();
  if (!member) redirect("/");

  // `fresh` is set only by the REFRESH button below, and its value is never
  // read -- it exists to make the request one the 30s cache cannot answer.
  const { fresh } = await searchParams;
  const board = fresh ? await fetchBoard(member.id) : await getBoard(member.id);
  const inTopTen = board.rows.some((row) => row.memberId === member.id);

  const podium = board.rows.slice(0, 3);
  const rest = podium.length === 3 ? board.rows.slice(3) : board.rows;

  return (
    <div className="shell">
      <main className="screen">
        <AutoRefresh />
        <h1 className="boardtitle">Leaderboard</h1>

        {board.rows.length === 0 ? (
          <p className="none" style={{ marginTop: 24 }}>
            No stamps collected yet. Be the first.
          </p>
        ) : (
          <>
            {/* The podium needs three to be a podium. Below that -- the first
                weeks of the card -- everyone goes in the list and nobody is
                standing on a block with two empty spaces beside them. */}
            {podium.length === 3 ? (
              <ol className="podium">
                {podium.map((row) => {
                  const isYou = row.memberId === member.id;
                  return (
                    <li
                      key={row.memberId}
                      className={`place p${row.position}${isYou ? " you" : ""}`}
                    >
                      <span className="face" aria-hidden="true">
                        {initials(row.name)}
                      </span>
                      <span className="who">{isYou ? "You" : row.name}</span>
                      <span className="tally">
                        {row.stamps}
                        <Bean />
                      </span>
                      <span className="plinth" aria-hidden="true">
                        {row.position}
                      </span>
                    </li>
                  );
                })}
              </ol>
            ) : null}

            {rest.length > 0 ? (
              <ol className="board" start={rest[0].position}>
                {rest.map((row) => {
                  const isYou = row.memberId === member.id;
                  return (
                    <li key={row.memberId} className={isYou ? "you" : undefined}>
                      <span className="pos">{row.position}</span>
                      <span className="face" aria-hidden="true">
                        {initials(row.name)}
                      </span>
                      <span className="who">{isYou ? "You" : row.name}</span>
                      <span className="tally">
                        {row.stamps}
                        <Bean />
                      </span>
                    </li>
                  );
                })}
              </ol>
            ) : null}
          </>
        )}

        {/* Shown only when they are not already on the board above, so nobody
            sees themselves listed twice. */}
        {!inTopTen && board.you.position > 0 ? (
          <ol className="board mine" start={board.you.position}>
            <li className="you">
              <span className="pos">{board.you.position}</span>
              <span className="face" aria-hidden="true">
                {initials(member.name)}
              </span>
              <span className="who">You</span>
              <span className="tally">
                {board.you.stamps}
                <Bean />
              </span>
            </li>
          </ol>
        ) : null}

        {!inTopTen && board.you.position > 0 ? (
          <p className="center-note">
            {board.you.position} of {board.you.total} collecting stamps
            {board.you.position <= BOARD_SIZE * 2
              ? " — not far off the top ten."
              : ""}
          </p>
        ) : null}

        {board.you.position === 0 ? (
          <p className="center-note">
            You haven&rsquo;t collected a stamp yet. Your next one puts you on
            the board.
          </p>
        ) : null}

        <div className="stack">
          <Link className="btn ghost" href="/card">
            BACK TO MY CARD
          </Link>
          <BoardRefreshButton />
        </div>

        <Footer />
      </main>
    </div>
  );
}
