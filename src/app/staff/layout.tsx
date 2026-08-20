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
};

export default function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
