import Link from "next/link";
import type { Metadata } from "next";
import { STAMPS_PER_REWARD } from "@/shared/members";
import { Footer } from "@/shared/ui/footer";
import { Wordmark } from "@/shared/ui/wordmark";

export const metadata: Metadata = {
  title: "Privacy Policy · Getta Rewards",
  description: "What Getta Rewards collects, why, and how to have it removed.",
};

/** Kept in sync by hand: bump when the text below changes. */
const UPDATED = "28 August 2026";

/** As registered with SSM. The brand is Getta Coffee; the company is not. */
const ENTITY = "MTHRIVE GROUP SDN. BHD.";
const CONTACT = "016 447 2925";

export default function PrivacyPage() {
  return (
    <div className="shell">
      <main className="screen">
        <Wordmark />
        <p className="eyebrow" style={{ textAlign: "center" }}>
          Privacy Policy
        </p>
        <p className="sub">Last updated {UPDATED}</p>

        <div className="sheet prose">
          <p>
            Getta Rewards is the loyalty card run by {ENTITY}, which
            operates Getta Coffee. This policy explains what we hold about you
            and what you can ask us to do with it, as required by the Personal
            Data Protection Act 2010.
          </p>

          <h2>What we collect</h2>
          <ul>
            <li>Your name and phone number, given when you join.</li>
            <li>
              Each stamp: the date, time and which outlet issued it.
            </li>
            <li>Each free drink you redeem, and when.</li>
          </ul>
          <p>
            Nothing else. No email, no address, no payment details, no location
            from your phone.
          </p>

          <h2>Why we collect it</h2>
          <p>
            To run the card: your phone number is how we find your card at the
            counter, and the stamps are the balance itself — {STAMPS_PER_REWARD}{" "}
            stamps for one free drink. Giving it is voluntary, but without a
            name and phone number we cannot issue a card.
          </p>

          <h2>Who can see it</h2>
          <p>
            Our staff, on the shop&apos;s own device, so they can find your card
            and add a stamp. Our technology providers store it on our behalf:
            Supabase (database) and Vercel (hosting). We do not sell your data,
            share it for advertising, or run any analytics or tracking in this
            app.
          </p>
          <p>
            Other members can see the leaderboard. If you are among the ten
            highest stamp counts, either all time or for the current month, your
            name and that count are shown there to anyone signed in to a Getta
            Rewards card. Nothing else appears: not your phone number, not where
            or when you were stamped. Everyone else sees only their own position,
            and if you would rather not appear at all, tell us and we will take
            you off it.
          </p>

          <h2>Cookies</h2>
          <p>
            One cookie keeps you signed in on your device for 30 days so you do
            not have to type your number every visit. Staff devices get a second
            one that lasts a shift. There are no advertising or tracking
            cookies.
          </p>

          <h2>How long we keep it</h2>
          <p>
            For as long as you are a member, so your stamps stay where you left
            them. Ask us to delete your card and it goes, along with its stamp
            history.
          </p>

          <h2>Your rights</h2>
          <p>
            You may ask to see, correct or delete what we hold, or to withdraw
            from the programme. Ask any of our staff, or contact us at {CONTACT}.
            We will act on your request within 21 days.
          </p>

          <h2>Changes</h2>
          <p>
            If this policy changes we will update the date at the top. Continuing
            to use your card means the current version applies.
          </p>

          <p className="bm">
            Notis ini juga tersedia dalam Bahasa Malaysia atas permintaan. Sila
            hubungi kami di {CONTACT}.
          </p>
        </div>

        <p style={{ textAlign: "center" }}>
          <Link className="link" href="/">
            Back
          </Link>
        </p>
        <Footer />
      </main>
    </div>
  );
}
