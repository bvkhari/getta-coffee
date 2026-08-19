import { redirect } from "next/navigation";
import { currentMember, STAMPS_PER_REWARD } from "@/shared/members";
import { Footer } from "@/shared/ui/footer";
import { Wordmark } from "@/shared/ui/wordmark";
import { EntryForm } from "@/features/membership/entry-form";

export default async function EntryPage() {
  // A returning member on the same device goes straight to their card. Checked
  // against the database, so a cookie for a member who no longer exists lands
  // here on the join screen instead of ping-ponging with /card.
  if (await currentMember()) redirect("/card");

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
