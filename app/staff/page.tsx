import { redirect } from "next/navigation";
import { isStaff } from "@/lib/session";
import { PasscodeForm } from "./passcode-form";

export const dynamic = "force-dynamic";

export const metadata = { title: "Getta Staff" };

export default async function StaffGatePage() {
  if (await isStaff()) redirect("/staff/lookup");

  return (
    <div className="shell dark">
      <main className="screen">
        <div className="staffbar">
          <span className="who">Staff · Getta Coffee</span>
        </div>
        <p className="eyebrow" style={{ textAlign: "center", marginTop: 40 }}>
          Counter access
        </p>
        <p className="center-note" style={{ marginBottom: 26 }}>
          Enter the shop passcode to add stamps and redeem free drinks.
        </p>
        <PasscodeForm />
      </main>
    </div>
  );
}
