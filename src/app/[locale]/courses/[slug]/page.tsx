import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { Link } from "@/i18n/navigation";
import { getCourseBySlug } from "@/lib/courses";
import { CourseOutline } from "@/components/courses/CourseOutline";
import { CourseWorkspace } from "@/components/courses/CourseWorkspace";
import { EditableCourseTitle } from "@/components/courses/EditableCourseTitle";
import { CourseHeaderControls } from "@/components/courses/CourseHeaderControls";

interface CoursePageProps {
  params: Promise<{ slug: string }>;
}

// A draft course only resolves for an editor/admin (canSeeUnpublished),
// same guard conditions/[slug]/page.tsx uses for disease.status —
// anyone else gets exactly the 404 a forged/expired slug would.
export default async function CoursePage({ params }: CoursePageProps) {
  const { slug } = await params;
  const session = await auth();
  const isEditor = session?.user.role === "editor" || session?.user.role === "admin";
  const course = await getCourseBySlug(slug, session?.user.id ?? null, isEditor);
  if (!course) notFound();

  const t = await getTranslations("courses");

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-16">
      <Link href="/courses" className="font-ui text-sm text-secondary hover:text-accent">
        {t("backToCourses")}
      </Link>

      <div className="flex flex-col gap-2">
        {isEditor ? (
          <EditableCourseTitle courseId={course.id} initialTitle={course.title} />
        ) : (
          <h1 className="font-heading text-2xl text-primary">{course.title}</h1>
        )}
        {!isEditor && course.description && (
          <p className="font-ui text-sm text-secondary">{course.description}</p>
        )}
      </div>

      {isEditor && (
        <CourseHeaderControls
          courseId={course.id}
          initialDescription={course.description}
          status={course.status}
        />
      )}

      {isEditor ? (
        <CourseWorkspace courseId={course.id} initialModules={course.modules} />
      ) : (
        <CourseOutline
          courseSlug={course.slug}
          modules={course.modules}
          lastLessonId={course.lastLessonId}
          isSignedIn={Boolean(session)}
        />
      )}
    </main>
  );
}
