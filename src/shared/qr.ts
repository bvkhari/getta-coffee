import QRCode from "qrcode";

/**
 * A QR code as an inline SVG string.
 *
 * Rendered on the server, so the card page ships no QR library to the browser
 * and the code is in the HTML on first paint. The customer is already holding
 * the phone out across the counter; a code that fades in a beat later is one
 * the barista has stopped waiting for.
 */
export function qrSvg(text: string): Promise<string> {
  return QRCode.toString(text, {
    type: "svg",
    // The surrounding .qrblock supplies the quiet zone as padding, so the SVG
    // itself doesn't also carry one and shrink the modules.
    margin: 0,
    // M survives a thumbprint or a patch of glare on a phone screen. Higher
    // levels buy more tolerance but pack more, smaller modules into the same
    // box, which is the wrong trade when the target is a scratched screen.
    errorCorrectionLevel: "M",
  });
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
