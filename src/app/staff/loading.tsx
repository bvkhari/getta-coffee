import Image from "next/image";
import mark from "@/public/getta-mark-cream.png";

/** The staff side is espresso-dark, so the mark flips to its cream cut. */
export default function StaffLoading() {
  return (
    <div className="loading dark" role="status" aria-label="Loading">
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
