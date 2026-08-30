import Link from "next/link";

export function Footer() {
  return (
    <p className="foot">
      Crafted with Care, Served with Quality
      <br />
      <Link href="/privacy">Privacy Policy</Link>
    </p>
  );
}
