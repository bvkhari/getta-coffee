import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Getta Rewards",
  description: "Collect 5 receipts and enjoy 1 free drink at Getta Coffee.",
  // iOS turns anything that looks like a phone number into a call link. The
  // member's own number is shown as a label, not something to dial.
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#241009",
  colorScheme: "only light",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
