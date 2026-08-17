import { redirect } from "next/navigation";
import { isStaff } from "@/lib/session";
import { lockUp } from "../actions";
import { Keypad } from "./keypad";

export const dynamic = "force-dynamic";

export const metadata = { title: "Getta Staff — Lookup" };

export default async function LookupPage() {
  if (!(await isStaff())) redirect("/staff");

  return (
    <div className="shell dark">
      <main className="screen">
        <div className="staffbar">
          <span className="who">Staff · Getta Coffee</span>
          <form action={lockUp}>
            <button className="link" type="submit" style={{ padding: 0 }}>
              Lock
            </button>
          </form>
        </div>
        <Keypad />
      </main>
    </div>
  );
}
