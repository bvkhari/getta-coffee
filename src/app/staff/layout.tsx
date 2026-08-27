import type { Metadata } from "next";

/**
 * The counter screen is passcode-gated and has no business in a search index.
 * See the note in src/app/card/layout.tsx for why this is page metadata rather
 * than a robots.txt rule.
 *
 * On the layout so /staff/lookup, /staff/locations and /staff/member/[id]
 * inherit it.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
  // A barista may well have both apps on one phone, so the counter app carries
  // its own name and a maroon icon rather than sharing the customer's.
  manifest: "/staff.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Getta Staff",
    statusBarStyle: "black-translucent",
  },
  icons: { apple: "/icons/staff-apple-touch-icon.png" },
};

export default function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
