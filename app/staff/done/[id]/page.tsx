import Link from "next/link";
import { redirect } from "next/navigation";
import { findById, getCard, STAMPS_PER_REWARD } from "@/lib/members";
import { isStaff } from "@/lib/session";
import { undoStamp } from "../../actions";
import { AutoReturn } from "./auto-return";

export const dynamic = "force-dynamic";

export const metadata = { title: "Getta Staff — Done" };

type Kind = "stamp" | "reward" | "redeemed";

export default async function StaffDonePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ kind?: string }>;
}) {
  if (!(await isStaff())) redirect("/staff");

  const { id } = await params;
  const { kind } = await searchParams;

  const member = await findById(id);
  if (!member) redirect("/staff/lookup");

  const card = await getCard(member);
  const what: Kind = kind === "reward" || kind === "redeemed" ? kind : "stamp";

  const message =
    what === "redeemed"
      ? "Free drink redeemed"
      : what === "reward"
        ? "Reward earned"
        : "Stamp added";

  const detail =
    what === "redeemed"
      ? `${member.name} · card back to ${card.stamps}`
      : what === "reward"
        ? `${member.name} has a free drink`
        : `${member.name} · ${card.stamps} of ${STAMPS_PER_REWARD}`;

  const celebratory = what !== "stamp";
  // A stamp can be taken back, so hold the screen long enough to notice and act.
  const undoable = what !== "redeemed";

  return (
    <div className={celebratory ? "shell confirm reward" : "shell confirm"}>
      <AutoReturn after={undoable ? 4000 : 1800} />
      <main className="screen">
        <div>
          <div className="tick">
            <svg
              viewBox="0 0 24 24"
              width="34"
              height="34"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </div>
          <p className="msg">{message}</p>
          <p className="who2">{detail}</p>

          <div className="confirm-actions">
            {undoable ? (
              <form action={undoStamp}>
                <input type="hidden" name="memberId" value={member.id} />
                <button className="btn oncolor" type="submit">
                  UNDO
                </button>
              </form>
            ) : null}
            <Link className="oncolor-link" href="/staff/lookup">
              Next customer
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
