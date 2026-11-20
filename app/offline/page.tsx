import Link from "next/link";

export const metadata = {
  title: "Offline — Saans",
  description: "Saans is offline. The last saved reading and plan are still available.",
};

export default function OfflinePage() {
  return (
    <main className="offline-shell">
      <span className="eyebrow">No connection</span>
      <h1>Saans is offline.</h1>
      <p>
        The last reading saved on this device is still available. Reconnect to refresh the air
        quality, forecast and plan.
      </p>
      <Link href="/" className="button button--dark">
        Try the saved plan
      </Link>
    </main>
  );
}
