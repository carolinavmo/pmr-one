import { notFound } from "next/navigation";
import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { auth } from "@/auth";
import { getSessionRunnerData } from "@/lib/question-bank-session";
import { SessionRunner } from "@/components/question-bank/SessionRunner";

interface SessionPageProps {
  params: Promise<{ sessionId: string }>;
}

// QBANK-IMPLEMENTATION.md Pass 4/5 — "no navbar and no sidebar" (the
// chrome opt-out lives in NavbarFrame.tsx/SidebarFrame.tsx, keyed off
// this same path). Signed-in only, same reasoning
// /flashcards/study/page.tsx already gives: every figure this screen
// shows is this member's own session.
export default async function QuestionBankSessionPage({ params }: SessionPageProps) {
  const session = await auth();
  if (!session) {
    redirect({ href: "/login", locale: await getLocale() });
    return;
  }

  const { sessionId } = await params;
  const data = await getSessionRunnerData(sessionId, session.user.id);
  if (!data) notFound();

  return <SessionRunner data={data} />;
}
