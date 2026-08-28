import Link from "next/link";
import { redirect } from "next/navigation";
import { currentMember } from "@/shared/members";
import {
  BOARD_SIZE,
  currentMonth,
  getBoard,
  monthLabel,
  type Scope,
} from "@/shared/leaderboard";
import { Footer } from "@/shared/ui/footer";

export const dynamic = "force-dynamic";

export const metadata = { title: "Leaderboard · Getta Rewards" };

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ scope?: string }>;
}) {
  const member = await currentMember();
  if (!member) redirect("/");

  const { scope: raw } = await searchParams;
  const scope: Scope = raw === "month" ? "month" : "all";

  const board = await getBoard(member.id, scope);
  const inTopTen = board.rows.some((row) => row.memberId === member.id);

  return (
    <div className="shell">
      <main className="screen">
        <p className="eyebrow">Leaderboard</p>

        <div className="scopes" role="tablist">
          <Link
            className={scope === "all" ? "scope on" : "scope"}
            href="/card/leaderboard"
            role="tab"
            aria-selected={scope === "all"}
          >
            ALL TIME
          </Link>
          <Link
            className={scope === "month" ? "scope on" : "scope"}
            href="/card/leaderboard?scope=month"
            role="tab"
            aria-selected={scope === "month"}
          >
            THIS MONTH
          </Link>
        </div>

        {scope === "month" ? (
          <p className="center-note">{monthLabel(currentMonth())}</p>
        ) : null}

        {board.rows.length === 0 ? (
          <p className="none" style={{ marginTop: 24 }}>
            No stamps collected yet this {scope === "month" ? "month" : "year"}.
            Be the first.
          </p>
        ) : (
          <ol className="board">
            {board.rows.map((row) => {
              const isYou = row.memberId === member.id;
              return (
                <li key={row.memberId} className={isYou ? "you" : undefined}>
                  <span className="pos">{row.position}</span>
                  <span className="who">{isYou ? "You" : row.name}</span>
                  <span className="tally">{row.stamps}</span>
                </li>
              );
            })}
          </ol>
        )}

        {/* Shown only when they are not already on the board above, so nobody
            sees themselves listed twice. */}
        {!inTopTen && board.you.position > 0 ? (
          <ol className="board mine" start={board.you.position}>
            <li className="you">
              <span className="pos">{board.you.position}</span>
              <span className="who">You</span>
              <span className="tally">{board.you.stamps}</span>
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
            You haven&rsquo;t collected a stamp{" "}
            {scope === "month" ? "this month" : "yet"}. Your next one puts you on
            the board.
          </p>
        ) : null}

        <div className="stack">
          <Link className="btn ghost" href="/card">
            BACK TO MY CARD
          </Link>
        </div>

        <Footer />
      </main>
    </div>
  );
}
