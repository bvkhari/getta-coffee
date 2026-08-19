import Image from "next/image";
import mark from "@/public/getta-mark.png";

/**
 * Shown while a page's server work runs — which here means a Supabase round
 * trip on every customer screen. Streamed as the Suspense fallback, so it
 * appears on a cold load too, not only on client navigation.
 */
export default function Loading() {
  return (
    <div className="loading" role="status" aria-label="Loading">
      <Image
        className="loading-mark"
        src={mark}
        alt=""
        sizes="96px"
        priority
      />
    </div>
  );
}
