import type { Metadata } from "next";

/**
 * A member's card is their own data behind a phone number, so it must stay out
 * of search results.
 *
 * This is page metadata rather than a `robots.txt` disallow on purpose: a
 * disallow stops a crawler fetching the page, which also stops it ever seeing a
 * `noindex`, so a URL linked from anywhere can still surface in results with no
 * content. The page-level rule is the one that actually keeps them out.
 *
 * On the layout rather than the page so /card/reward inherits it too.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function CardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
