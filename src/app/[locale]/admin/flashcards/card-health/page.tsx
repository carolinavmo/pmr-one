import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import { auth } from "@/auth";
import { getCardHealthReport } from "@/lib/flashcards-admin";
import { richTextToPlainText } from "@/lib/rich-text";

// "Card health: a list of cards with the worst retention across all
// users — the cards everybody fails are usually badly written, not
// hard." (FLASHCARDS-IMPLEMENTATION.md Pass 7)
export default async function AdminCardHealthPage() {
  const session = await auth();
  const locale = await getLocale();
  if (!session) {
    redirect({ href: "/login", locale });
    return;
  }
  if (session.user.role !== "editor" && session.user.role !== "admin") {
    redirect({ href: "/login", locale });
    return;
  }

  const rows = await getCardHealthReport();

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-10">
      <div>
        <Link href="/admin/flashcards" className="font-ui text-xs font-bold text-secondary hover:text-primary">
          ← Flashcards
        </Link>
        <h1 className="mt-2 font-heading text-2xl text-primary">Card health</h1>
        <p className="font-ui text-sm text-secondary">
          Cards with the worst retention across every reader (at least 5 logged answers) — usually a sign the card is written badly, not that the material is hard.
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-8 text-center font-ui text-sm text-secondary">
          Not enough review history yet to rank any cards.
        </p>
      ) : (
        <div className="flex flex-col divide-y divide-border overflow-hidden rounded-xl border border-border shadow-sm">
          {rows.map((row) => (
            <Link
              key={row.cardId}
              href={`/admin/flashcards/${row.deckId}`}
              className="flex items-center justify-between gap-4 bg-surface p-4 hover:bg-surface-raised/60"
            >
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="truncate font-ui text-sm font-medium text-primary">{richTextToPlainText(row.question)}</span>
                <span className="font-ui text-xs text-secondary">
                  {row.deckName} · {row.totalAnswers} answers logged
                </span>
              </div>
              <span
                className="shrink-0 rounded-full px-2.5 py-1 font-ui text-xs font-black"
                style={{
                  backgroundColor: row.correctPercent < 50 ? "#FDF0EF" : row.correctPercent < 70 ? "#FEF7E8" : "#EDF9F2",
                  color: row.correctPercent < 50 ? "#B8262B" : row.correctPercent < 70 ? "#A8760F" : "#1F7A4D",
                }}
              >
                {row.correctPercent}% correct
              </span>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
