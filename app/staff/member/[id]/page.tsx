import Link from "next/link";
import { redirect } from "next/navigation";
import { canUndo, findById, getCard, STAMPS_PER_REWARD } from "@/lib/members";
import { isStaff } from "@/lib/session";
import { Slots } from "../../../components";
import { lockUp, stamp, undoStamp } from "../../actions";
import { RedeemButton } from "./redeem-button";

export const dynamic = "force-dynamic";

export const metadata = { title: "Getta Staff — Customer" };

export default async function StaffMemberPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ dup?: string; undone?: string; expired?: string }>;
}) {
  if (!(await isStaff())) redirect("/staff");

  const { id } = await params;
  const { dup, undone, expired } = await searchParams;

  const member = await findById(id);
  if (!member) redirect("/staff/lookup");

  const card = await getCard(member);
  const joined = new Date(member.created_at).toLocaleDateString("en-GB", {
    month: "short",
    year: "numeric",
  });
  const undoable = canUndo(card);

  return (
    <div className="shell dark">
      <main className="screen">
        <div className="staffbar">
          <span className="who">Staff · Getta Coffee</span>
          <form action={lockUp}>
            <button className="link" type="submit" style={{ padding: 0 }}>
              Lock
            </button>
          </form>
        </div>

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
            BACK TO LOOKUP
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
      </main>
    </div>
  );
}
