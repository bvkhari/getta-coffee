import Link from "next/link";
import { redirect } from "next/navigation";
import {
  loadCard,
  STAMPS_PER_REWARD,
  voucherCode,
} from "@/shared/members";
import { currentMemberId } from "@/shared/session";
import { Footer } from "@/shared/ui/footer";

export const dynamic = "force-dynamic";

export default async function RewardPage() {
  const id = await currentMemberId();
  const found = id ? await loadCard(id) : null;
  if (!found) redirect("/");
  const { member, card } = found;
  if (card.rewardsReady < 1) redirect("/card");

  return (
    <div className="shell">
      <main className="screen">
        <p className="eyebrow">Reward earned</p>

        <div className="voucher">
          <p className="kicker">Getta Rewards</p>
          <p className="what">
            {card.rewardsReady > 1 ? `${card.rewardsReady} free` : "One free"}
            <br />
            {card.rewardsReady > 1 ? "drinks." : "drink."}
          </p>
          <div className="perf" />
          <p className="code">{voucherCode(member.id)}</p>
          <p className="note">Show this screen to staff to redeem.</p>
        </div>

        <p className="center-note">
          Earned after {STAMPS_PER_REWARD} receipts. Staff redeem it at the
          counter and your card starts counting again.
        </p>

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
