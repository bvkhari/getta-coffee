import Link from "next/link";
import { redirect } from "next/navigation";
import { staffPlace } from "@/shared/session";
import { lockUp } from "@/features/staff/actions";
import { LookupPanel } from "@/features/staff/lookup-panel";
import { InstallHint } from "@/features/pwa/install-hint";

export const dynamic = "force-dynamic";

export const metadata = { title: "Getta Staff — Lookup" };

export default async function LookupPage() {
  const place = await staffPlace();
  if (!place) redirect("/staff");

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
        <LookupPanel />
        <InstallHint storageKey="getta-install-staff" />
        <p className="center-note" style={{ marginTop: 26 }}>
          <Link className="link" href="/staff/locations">
            Manage locations
          </Link>
        </p>
      </main>
    </div>
  );
}
