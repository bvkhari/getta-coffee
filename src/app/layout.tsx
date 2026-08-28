import type { Metadata, Viewport } from "next";
import "@/styles/globals.css";
import { RegisterServiceWorker } from "@/features/pwa/register-service-worker";

export const metadata: Metadata = {
  title: "Getta Rewards",
  description: "Collect 5 receipts and enjoy 1 free drink at Getta Coffee.",
  // iOS turns anything that looks like a phone number into a call link. The
  // member's own number is shown as a label, not something to dial.
  formatDetection: { telephone: false },
  manifest: "/manifest.webmanifest",
  // iOS ignores the manifest entirely for the home-screen icon and title, so
  // both have to be declared again here. The staff layout overrides them.
  appleWebApp: {
    capable: true,
    title: "Getta",
    statusBarStyle: "default",
  },
  // Next emits the standardised mobile-web-app-capable. Older iPhones only
  // recognise Apple's original spelling, and without one of the two the app
  // opens in a Safari tab instead of standalone -- which is the whole point.
  other: { "apple-mobile-web-app-capable": "yes" },
  icons: {
    icon: [
      { url: "/icons/customer-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/customer-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // The customer app is cream. iOS paints the status-bar strip of an installed
  // app with this, and espresso there put a dark band above a cream page. The
  // staff layout sets its own, because the counter app really is dark.
  themeColor: "#FBF4E9",
  colorScheme: "only light",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
        <RegisterServiceWorker />
      </body>
    </html>
  );
}
