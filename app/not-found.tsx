import Link from "next/link";
import "./not-found.css";

export default function NotFound() {
  return (
    <main className="not-found">
      <p className="eyebrow">404 · missed the turn</p>
      <h1>This street doesn&apos;t lead anywhere.</h1>
      <p>The air plan is still one click away.</p>
      <Link href="/" className="button button--dark">
        Back to Saans
      </Link>
    </main>
  );
}
