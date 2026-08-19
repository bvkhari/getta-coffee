import { redirect } from "next/navigation";
import { listLocations } from "@/features/staff/locations";
import { isStaff } from "@/shared/session";
import { PasscodeForm } from "@/features/staff/passcode-form";

export const dynamic = "force-dynamic";

export const metadata = { title: "Getta Staff" };

export default async function StaffGatePage() {
  if (await isStaff()) redirect("/staff/lookup");

  const places = await listLocations(true);

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
          Pick where you are, then enter the shop passcode. Stamps you add today
          are tagged with that location.
        </p>
        <PasscodeForm places={places} />
      </main>
    </div>
  );
}
