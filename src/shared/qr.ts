import QRCode from "qrcode";
import {
  GETTA_MARK_ASPECT,
  GETTA_MARK_DATA_URI,
} from "@/shared/getta-mark-data";

/**
 * How much of the code's width the mark covers.
 *
 * Level H recovers 30% of a damaged code, and the mark is damage as far as the
 * decoder is concerned. Covering 20% of the width is roughly 4% of the area
 * once the white plate is counted, which sits far enough inside that budget to
 * survive a thumbprint on top of it. Raising this is the first thing that will
 * quietly break scanning, so it is measured against the round-trip test in
 * scripts rather than eyeballed.
 */
const MARK_WIDTH = 0.2;
const PLATE_PADDING = 1.28;

/**
 * A QR code as an inline SVG string, with the Getta mark in the middle.
 *
 * Rendered on the server, so the card page ships no QR library to the browser
 * and the code is in the HTML on first paint. The customer is already holding
 * the phone out across the counter; a code that fades in a beat later is one
 * the barista has stopped waiting for.
 */
export async function qrSvg(text: string): Promise<string> {
  const svg = await QRCode.toString(text, {
    type: "svg",
    // The surrounding .qrblock supplies the quiet zone as padding, so the SVG
    // itself doesn't also carry one and shrink the modules.
    margin: 0,
    // H, not M: the mark blanks out the centre, and only H's 30% recovery
    // budget can absorb that and still decode.
    errorCorrectionLevel: "H",
  });

  // qrcode sizes the viewBox in modules, so the overlay is placed in the same
  // units and scales with whatever the page renders the SVG at.
  const modules = Number(svg.match(/viewBox="0 0 (\d+)/)?.[1] ?? 0);
  if (!modules) return svg;

  const centre = modules / 2;
  const markW = modules * MARK_WIDTH;
  const markH = markW / GETTA_MARK_ASPECT;
  const plate = Math.max(markW, markH) * PLATE_PADDING;

  const overlay =
    `<rect x="${centre - plate / 2}" y="${centre - plate / 2}" ` +
    `width="${plate}" height="${plate}" rx="${plate * 0.14}" fill="#FFFFFF"/>` +
    `<image x="${centre - markW / 2}" y="${centre - markH / 2}" ` +
    `width="${markW}" height="${markH}" ` +
    `preserveAspectRatio="xMidYMid meet" href="${GETTA_MARK_DATA_URI}"/>`;

  return svg.replace("</svg>", `${overlay}</svg>`);
}

/**
 * What the customer's QR encodes: the staff URL for their card.
 *
 * A full URL rather than a bare id, because it costs nothing and means a phone's
 * stock camera app lands on the right screen too, if the in-app scanner is ever
 * unavailable. Built from the request host so staging and production each print
 * their own without another environment variable to keep in sync.
 */
export function memberScanUrl(host: string, proto: string, memberId: string) {
  return `${proto}://${host}/staff/member/${memberId}`;
}
