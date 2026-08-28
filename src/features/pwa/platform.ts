/**
 * Which install tutorial a visitor needs.
 *
 * Kept as a pure function of the values the browser reports, so it can be
 * checked against real user-agent strings rather than only in a device lab.
 */
export type Platform = "ios-safari" | "ios-other-browser" | "android" | null;

/**
 * Only Safari can add an app to the iOS home screen. Chrome, Firefox and Edge
 * on iOS are Safari underneath but have no such menu item, so sending someone
 * to hunt for a Share sheet that cannot finish the job is worse than telling
 * them to switch browser.
 */
const IOS_THIRD_PARTY = /CriOS|FxiOS|EdgiOS|OPiOS|GSA\//;

function iosFlavour(ua: string): Platform {
  return IOS_THIRD_PARTY.test(ua) ? "ios-other-browser" : "ios-safari";
}

export function detectPlatform(
  ua: string,
  platform: string,
  touchPoints: number,
): Platform {
  // The user agent is asked first and the platform string second, because
  // navigator.platform is deprecated, frozen on some browsers, and reports
  // "MacIntel" for anything running on a Mac -- including a device-emulating
  // browser sending an Android user agent. Trusting it first handed Android
  // users the iPhone tutorial.
  if (/Android/.test(ua)) return "android";
  if (/iPad|iPhone|iPod/.test(ua)) return iosFlavour(ua);

  // Only now the heuristic for iPadOS, which since version 13 reports itself
  // as a desktop Mac and names no Apple device in its user agent at all. A
  // real Mac has no touch points, which is the only thing separating them.
  if (platform === "MacIntel" && touchPoints > 1) return iosFlavour(ua);

  return null;
}
