/**
 * A tiny event bus so any surface (a plan action, a pollutant card, a city row)
 * can hand the assistant a grounded question without threading callbacks
 * through the whole component tree. The assistant subscribes once per mount.
 */
const ASK_EVENT = "saans:ask";

type AskHandler = (question: string) => void;

export function askSaans(question: string): void {
  if (typeof window === "undefined") return;
  const trimmed = question.trim();
  if (!trimmed) return;
  window.dispatchEvent(new CustomEvent<string>(ASK_EVENT, { detail: trimmed }));
}

export function onAskSaans(handler: AskHandler): () => void {
  if (typeof window === "undefined") return () => undefined;
  const listener = (event: Event) => {
    const question = (event as CustomEvent<string>).detail;
    if (typeof question === "string" && question.trim()) handler(question.trim());
  };
  window.addEventListener(ASK_EVENT, listener);
  return () => window.removeEventListener(ASK_EVENT, listener);
}
