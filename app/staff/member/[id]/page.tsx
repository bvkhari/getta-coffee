import Link from "next/link";
import { redirect } from "next/navigation";
import { canUndo, findById, getCard, STAMPS_PER_REWARD } from "@/lib/members";
import { staffPlace } from "@/lib/session";
import { Slots, formatVisit } from "../../../components";
import { lockUp, stamp, undoStamp } from "../../actions";
import { RedeemButton } from "./redeem-button";

export const dynamic = "force-dynamic";

export const metadata = { title: "Getta Staff — Customer" };

type Done = "stamp" | "reward" | "redeemed";

/**
 * The confirmation lives on the card rather than on its own screen. Staff see
 * what happened and the customer's new state in one place, and there is no
 * timer to wait out before the next action.
 */
function confirmation(done: Done, name: string, stamps: number) {
  if (done === "redeemed") {
    return {
      tone: "gold",
      message: "Free drink redeemed",
      detail: `${name} · card back to ${stamps}`,
    };
  }
  if (done === "reward") {
    return {
      tone: "gold",
      message: "Reward earned",
      detail: `${name} has a free drink`,
    };
  }
  return {
    tone: "go",
    message: "Stamp added",
    detail: `${name} · ${stamps} of ${STAMPS_PER_REWARD}`,
  };
}

export default async function StaffMemberPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    done?: string;
    dup?: string;
    undone?: string;
    expired?: string;
  }>;
}) {
  const place = await staffPlace();
  if (!place) redirect("/staff");

  const { id } = await params;
  const { done, dup, undone, expired } = await searchParams;

  const member = await findById(id);
  if (!member) redirect("/staff/lookup");

  const card = await getCard(member);
  const joined = new Date(member.created_at).toLocaleDateString("en-GB", {
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kuala_Lumpur",
  });
  const undoable = canUndo(card);

  const banner =
    done === "stamp" || done === "reward" || done === "redeemed"
      ? confirmation(done, member.name, card.stamps)
      : null;

  return (
    <div className="shell dark">
      <main className="screen">
        <div className="staffbar">
          <span className="who">Staff · {place}</span>
          <form action={lockUp}>
            <button className="link" type="submit" style={{ padding: 0 }}>
              Lock
            </button>
          </form>
        </div>

        {banner ? (
          <div className={`banner ${banner.tone}`} role="status">
            <span className="banner-tick" aria-hidden="true">
              <svg
                viewBox="0 0 24 24"
                width="20"
                height="20"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </span>
            <span>
              <span className="banner-msg">{banner.message}</span>
              <span className="banner-sub">{banner.detail}</span>
            </span>
          </div>
        ) : null}

        <div className="found">
          <p className="nm">{member.name}</p>
          <p className="ph">
            {member.phone} · member since {joined}
          </p>
          <Slots stamps={card.stamps} />
          <p className="count">
            {card.stamps} of {STAMPS_PER_REWARD} stamps
          </p>
        </div>

        {dup ? (
          <p className="err" role="alert">
            That stamp was already added a moment ago.
          </p>
        ) : null}
        {undone ? (
          <p className="note-ok" role="status">
            Last stamp removed.
          </p>
        ) : null}
        {expired ? (
          <p className="err" role="alert">
            Nothing recent left to undo.
          </p>
        ) : null}

        <div className="stack">
          {card.rewardsReady > 0 ? (
            <RedeemButton memberId={member.id} />
          ) : (
            <form action={stamp}>
              <input type="hidden" name="memberId" value={member.id} />
              <button className="btn go big" type="submit">
                +1 STAMP
              </button>
            </form>
          )}

          <Link className="btn ghost" href="/staff/lookup">
            NEXT CUSTOMER
          </Link>
        </div>

        {undoable ? (
          <form action={undoStamp} style={{ margin: "18px auto 0" }}>
            <input type="hidden" name="memberId" value={member.id} />
            <button className="link" type="submit">
              Undo last stamp
            </button>
          </form>
        ) : null}

        {card.visits.length > 0 ? (
          <div className="hist">
            <h2>Recent stamps</h2>
            <ul>
              {card.visits.slice(0, 5).map((visit) => (
                <li key={visit.at}>
                  <span>{visit.location ?? "Receipt collected"}</span>
                  <span>{formatVisit(visit.at)}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </main>
    </div>
  );
}
