import { RichText } from "./RichText";

export function LegalPage({ title, updated, body }: { title: string; updated: string; body: string }) {
  return (
    <article className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-3xl font-bold">{title}</h1>
      <p className="text-sm muted">Last updated {updated}</p>
      <RichText text={body} className="leading-relaxed" />
    </article>
  );
}
