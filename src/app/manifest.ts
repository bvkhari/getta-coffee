import type { MetadataRoute } from "next";

/**
 * The customer's home-screen app.
 *
 * start_url is "/" rather than "/card" because the entry page already sends a
 * signed-in member straight to their card, and a member whose session has
 * lapsed gets the sign-in screen instead of a redirect bounce.
 *
 * There is a second manifest at /staff.webmanifest for the counter app. One
 * manifest can only declare one name, icon and start_url, and installing the
 * customer app on a barista's phone would put them in the wrong screen.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Getta Rewards",
    short_name: "Getta",
    description: "Collect 5 receipts and enjoy 1 free drink at Getta Coffee.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#FBF4E9",
    theme_color: "#241009",
    icons: [
      { src: "/icons/customer-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/customer-512.png", sizes: "512x512", type: "image/png" },
      // Android crops icons to whatever shape the launcher uses, so the
      // maskable copy carries extra padding and must be listed separately.
      {
        src: "/icons/customer-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
