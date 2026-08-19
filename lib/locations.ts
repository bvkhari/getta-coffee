import { unstable_cache, updateTag } from "next/cache";
import { db } from "@/lib/supabase";

/**
 * Where stamps get earned. The café owns this list, so opening a branch or
 * closing one is a job for whoever is at the counter, not a deploy.
 */
export type Location = {
  id: string;
  name: string;
  active: boolean;
  asks_event: boolean;
};

const COLS = "id, name, active, asks_event";

/**
 * Every staff screen reads this list on every load, on a device that stays open
 * all shift, and the list changes about twice a year. So it is cached until a
 * write says otherwise; the hour is only a backstop.
 */
const TAG = "locations";
const AN_HOUR = 3600;

export const listLocations = unstable_cache(
  async (activeOnly = false): Promise<Location[]> => {
    let query = db().from("locations").select(COLS).order("name");
    if (activeOnly) query = query.eq("active", true);

    const { data, error } = await query;
    if (error) throw error;
    return data as Location[];
  },
  ["locations-list"],
  { tags: [TAG], revalidate: AN_HOUR },
);

/** The row a staff member may unlock as, or null. Closed branches don't count. */
export const findActiveLocation = unstable_cache(
  async (name: string): Promise<Location | null> => {
    const { data, error } = await db()
      .from("locations")
      .select(COLS)
      .eq("name", name)
      .eq("active", true)
      .maybeSingle();

    if (error) throw error;
    return (data as Location | null) ?? null;
  },
  ["location-active"],
  { tags: [TAG], revalidate: AN_HOUR },
);

export async function createLocation(
  name: string,
  asksEvent: boolean,
): Promise<void> {
  const { error } = await db()
    .from("locations")
    .insert({ name, asks_event: asksEvent });
  if (error) throw error;
  updateTag(TAG);
}

/**
 * Closes or reopens a location. Never deletes: a branch that shuts still has
 * stamps with its name on them, and one that reopens keeps its identity.
 */
export async function setLocationActive(
  id: string,
  active: boolean,
): Promise<void> {
  const { error } = await db().from("locations").update({ active }).eq("id", id);
  if (error) throw error;
  updateTag(TAG);
}
