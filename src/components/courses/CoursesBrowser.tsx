"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import type { CourseSummary } from "@/lib/courses";
import { CourseCard } from "./CourseCard";
import { NewCourseDrawer } from "./NewCourseDrawer";
import { Button } from "@/components/ui/Button";

export function CoursesBrowser({
  courses,
  isEditor,
}: {
  courses: CourseSummary[];
  isEditor: boolean;
}) {
  const t = useTranslations("courses");
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      {isEditor && (
        <div className="flex justify-end">
          <Button type="button" variant="primary" onClick={() => setDrawerOpen(true)}>
            <Plus className="size-4" aria-hidden="true" />
            {t("newCourseTitle")}
          </Button>
        </div>
      )}

      {courses.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-8 text-center font-ui text-sm text-secondary">
          {t("noCourses")}
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <CourseCard key={course.id} course={course} t={t} />
          ))}
        </div>
      )}

      <NewCourseDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  );
}
