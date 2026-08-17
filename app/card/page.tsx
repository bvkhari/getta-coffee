import Link from "next/link";
import { redirect } from "next/navigation";
import { getCard, findById } from "@/lib/members";
import { currentMemberId } from "@/lib/session";
import { logOut } from "../actions";
import { Eyebrow, Footer, Progress, Slots, formatVisit } from "../components";

export const dynamic = "force-dynamic";

export default async function CardPage({
  searchParams,
}: {
  searchParams: Promise<{ welcome?: string }>;
}) {
  const memberId = await currentMemberId();
  if (!memberId) redirect("/");

  const member = await findById(memberId);
  if (!member) redirect("/");

  const card = await getCard(member);
  const { welcome } = await searchParams;
  const firstName = member.name.split(" ")[0];

  return (
    <div className="shell">
      <main className="screen">
        <Eyebrow>
          {welcome ? `Welcome, ${firstName}` : "Getta Rewards"}
        </Eyebrow>

        {welcome ? (
          <p className="sub">
            Your card is open and waiting for its first stamp. Give your phone
            number at the counter on your next visit.
          </p>
        ) : null}

        <div className="member">
          <p className="name">{member.name}</p>
          <span className="since">{member.phone}</span>
        </div>

        <div className="stampcard">
          <Slots stamps={card.stamps} />
          <Progress stamps={card.stamps} redeemed={card.redeemed} />
        </div>

        {card.rewardsReady > 0 ? (
          <div className="stack">
            <Link className="btn gold" href="/card/reward">
              {card.rewardsReady > 1
                ? `VIEW MY ${card.rewardsReady} FREE DRINKS`
                : "VIEW MY FREE DRINK"}
            </Link>
          </div>
        ) : null}

        <div className="hist">
          <h2>Visit history</h2>
          {card.visits.length === 0 && card.redeemed === 0 ? (
            <p className="none">
              No visits yet. Your first stamp lands the next time you order.
            </p>
          ) : (
            <ul>
              {card.visits.map((iso, i) => (
                <li key={i}>
                  <span>Receipt collected</span>
                  <span>{formatVisit(iso)}</span>
                </li>
              ))}
              {card.redeemed > 0 ? (
                <li>
                  <span>Free drink redeemed</span>
                  <span>{card.redeemed}× to date</span>
                </li>
              ) : null}
            </ul>
          )}
        </div>

        <form action={logOut} style={{ margin: "26px auto 0" }}>
          <button className="link" type="submit">
            Sign out
          </button>
        </form>

        <Footer />
      </main>
    </div>
  );
}

export const metadata = { title: "My Card · Getta Rewards" };
