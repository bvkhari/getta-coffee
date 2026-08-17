import Link from "next/link";
import { redirect } from "next/navigation";
import { listLocations } from "@/lib/locations";
import { isStaff } from "@/lib/session";
import { addLocation, lockUp, toggleLocation } from "../actions";

export const dynamic = "force-dynamic";

export const metadata = { title: "Getta Staff — Locations" };

export default async function LocationsPage({
  searchParams,
}: {
  searchParams: Promise<{
    added?: string;
    taken?: string;
    bad?: string;
    closed?: string;
    reopened?: string;
    last?: string;
  }>;
}) {
  if (!(await isStaff())) redirect("/staff");

  const { added, taken, bad, closed, reopened, last } = await searchParams;
  const places = await listLocations();
  const open = places.filter((place) => place.active);
  const shut = places.filter((place) => !place.active);

  return (
    <div className="shell dark">
      <main className="screen">
        <div className="staffbar">
          <span className="who">Staff · Locations</span>
          <form action={lockUp}>
            <button className="link" type="submit" style={{ padding: 0 }}>
              Lock
            </button>
          </form>
        </div>

        <p className="center-note" style={{ margin: "26px 0 0" }}>
          Open a new branch or close one that has stopped trading. Closing hides
          it from the unlock screen; stamps already taken there keep their name.
        </p>

        {added ? (
          <p className="note-ok" role="status">
            Location added.
          </p>
        ) : null}
        {closed ? (
          <p className="note-ok" role="status">
            Location closed.
          </p>
        ) : null}
        {reopened ? (
          <p className="note-ok" role="status">
            Location reopened.
          </p>
        ) : null}
        {taken ? (
          <p className="err" role="alert">
            That location already exists.
          </p>
        ) : null}
        {bad ? (
          <p className="err" role="alert">
            Give the location a name, up to 40 characters.
          </p>
        ) : null}
        {last ? (
          <p className="err" role="alert">
            That is the last open location. Add another before closing this one.
          </p>
        ) : null}

        <div className="places-list">
          <h2>Open</h2>
          <ul>
            {open.map((place) => (
              <li key={place.id}>
                <span>
                  {place.name}
                  {place.asks_event ? <em> · asks for an event name</em> : null}
                </span>
                <form action={toggleLocation}>
                  <input type="hidden" name="id" value={place.id} />
                  <input type="hidden" name="active" value="0" />
                  <button className="link" type="submit">
                    Close
                  </button>
                </form>
              </li>
            ))}
          </ul>

          {shut.length > 0 ? (
            <>
              <h2>Closed</h2>
              <ul>
                {shut.map((place) => (
                  <li key={place.id}>
                    <span>{place.name}</span>
                    <form action={toggleLocation}>
                      <input type="hidden" name="id" value={place.id} />
                      <input type="hidden" name="active" value="1" />
                      <button className="link" type="submit">
                        Reopen
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </div>

        <form action={addLocation} className="fields" style={{ padding: 0 }}>
          <label className="f">
            New location
            <input
              className="t"
              type="text"
              name="name"
              maxLength={40}
              placeholder="Batu Pahat"
              autoComplete="off"
              required
            />
          </label>
          <label className="check">
            <input type="checkbox" name="asksEvent" />
            Ask for an event name — for pop-up stands
          </label>
          <button className="btn" type="submit">
            ADD LOCATION
          </button>
        </form>

        <div className="stack">
          <Link className="btn ghost" href="/staff/lookup">
            BACK TO KEYPAD
          </Link>
        </div>
      </main>
    </div>
  );
}
