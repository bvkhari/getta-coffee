import Image from "next/image";
import wordmark from "@/public/getta-wordmark.png";

/**
 * The real stencil wordmark. Eager, because it is the first thing a customer
 * sees and lazy-loading the brand reads as a broken page.
 */
export function Wordmark() {
  return (
    <Image
      className="wordmark"
      src={wordmark}
      alt="Getta Coffee"
      sizes="176px"
      priority
    />
  );
}
