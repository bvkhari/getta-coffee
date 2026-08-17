import Link from "next/link";
import { redirect } from "next/navigation";
import { findById, getCard, STAMPS_PER_REWARD } from "@/lib/members";
import { isStaff } from "@/lib/session";
import { Slots } from "../../../components";
import { lockUp, redeem, stamp } from "../../actions";

export const dynamic = "force-dynamic";

export const metadata = { title: "Getta Staff — Customer" };

export default async function StaffMemberPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ dup?: string }>;
}) {
  if (!(await isStaff())) redirect("/staff");

  const { id } = await params;
  const { dup } = await searchParams;

  const member = await findById(id);
  if (!member) redirect("/staff/lookup");

  const card = await getCard(member);
  const joined = new Date(member.created_at).toLocaleDateString("en-GB", {
    month: "short",
    year: "numeric",
  });

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

        <div className="stack">
          {card.rewardsReady > 0 ? (
            <form action={redeem}>
              <input type="hidden" name="memberId" value={member.id} />
              <button className="btn gold big" type="submit">
                REDEEM FREE DRINK
              </button>
            </form>
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
      </main>
    </div>
  );
}
