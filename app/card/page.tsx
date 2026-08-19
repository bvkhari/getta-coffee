import Link from "next/link";
import { redirect } from "next/navigation";
import { currentMember, getCard } from "@/lib/members";
import { logOut } from "../actions";
import { Footer, Progress, Slots, formatVisit } from "../components";
import { RefreshButton } from "./refresh-button";

export const dynamic = "force-dynamic";

export default async function CardPage({
  searchParams,
}: {
  searchParams: Promise<{ welcome?: string }>;
}) {
  const member = await currentMember();
  if (!member) redirect("/");

  const card = await getCard(member.id);
  const { welcome } = await searchParams;
  const firstName = member.name.split(" ")[0];

  return (
    <div className="shell">
      <main className="screen">
        <p className="eyebrow">
          {welcome ? `Welcome, ${firstName}` : "Getta Rewards"}
        </p>

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
              {card.visits.map((visit) => (
                <li key={visit.at}>
                  <span>
                    Receipt collected
                    {visit.location ? ` · ${visit.location}` : ""}
                  </span>
                  <span>{formatVisit(visit.at)}</span>
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

        <div className="stack">
          <RefreshButton />
        </div>

        <form action={logOut} className="signout">
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
