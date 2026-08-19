export function formatVisit(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    // These render on the server, which runs in UTC. Without this, a stamp taken
    // after midnight in Malaysia is dated the day before.
    timeZone: "Asia/Kuala_Lumpur",
  });
}
