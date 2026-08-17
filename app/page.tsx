import { redirect } from "next/navigation";
import { STAMPS_PER_REWARD } from "@/lib/members";
import { currentMemberId } from "@/lib/session";
import { Footer, Wordmark } from "./components";
import { EntryForm } from "./entry-form";

export default async function EntryPage() {
  // A returning member on the same device goes straight to their card.
  if (await currentMemberId()) redirect("/card");

  return (
    <div className="shell">
      <main className="screen">
        <Wordmark />
        <h1 className="hero">
          Your coffee,
          <br />
          rewarded.
        </h1>
        <p className="sub">
          Collect {STAMPS_PER_REWARD} receipts and enjoy 1 free drink.
        </p>
        <EntryForm />
        <Footer />
      </main>
    </div>
  );
}
