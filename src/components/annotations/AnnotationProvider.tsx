"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { Annotation } from "@/lib/annotations";

interface AnnotationContextValue {
  enabled: boolean;
  diseaseId: string;
  annotationsFor: (blockId: string, blockField: string) => Annotation[];
  allAnnotations: Annotation[];
  locatedIds: Set<string>;
  reportLocated: (id: string, located: boolean) => void;
  addAnnotation: (annotation: Annotation) => void;
  updateAnnotationLocal: (id: string, body: string) => void;
  removeAnnotation: (id: string) => void;
}

// Default value (no Provider in the tree — a visitor, or any page
// this isn't mounted on) means "annotations off," full stop — same
// "no Provider = definitely off, not just hidden" contract as
// EditMode.tsx. AnnotatableProse checks `enabled` before touching the
// DOM at all, so a visitor's rendered output stays byte-identical to
// a page that has never heard of this feature.
const AnnotationContext = createContext<AnnotationContextValue>({
  enabled: false,
  diseaseId: "",
  annotationsFor: () => [],
  allAnnotations: [],
  locatedIds: new Set(),
  reportLocated: () => {},
  addAnnotation: () => {},
  updateAnnotationLocal: () => {},
  removeAnnotation: () => {},
});

export function useAnnotations() {
  return useContext(AnnotationContext);
}

// Only ever mounted by the disease page when a session exists, wrapping
// both the reading column (where AnnotatableProse instances relocate
// and render markers) and the Workspace drawer (whose management list
// needs the same locatedIds/allAnnotations) — one shared source of
// truth, since the drawer can't independently probe the reading
// column's DOM (some fields, e.g. a SelfCheckBlock's answer, aren't
// even mounted until the member clicks "Show answer").
//
// Every mutation here is local state only — no server refetch. The
// server actions this reads from (src/lib/actions/annotations.ts)
// deliberately skip revalidatePath, since nothing else server-rendered
// depends on one member's private annotations; this Provider's own
// state is the only place that needs to reflect a create/update/delete
// immediately.
export function AnnotationProvider({
  diseaseId,
  initialAnnotations,
  children,
}: {
  diseaseId: string;
  initialAnnotations: Annotation[];
  children: ReactNode;
}) {
  const [annotations, setAnnotations] = useState(initialAnnotations);
  const [locatedIds, setLocatedIds] = useState<Set<string>>(() => new Set());

  const annotationsFor = useCallback(
    (blockId: string, blockField: string) =>
      annotations.filter((a) => a.blockId === blockId && a.blockField === blockField),
    [annotations],
  );

  const reportLocated = useCallback((id: string, located: boolean) => {
    setLocatedIds((current) => {
      const already = current.has(id);
      if (located === already) return current;
      const next = new Set(current);
      if (located) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const addAnnotation = useCallback((annotation: Annotation) => {
    setAnnotations((current) => [...current, annotation]);
  }, []);

  const updateAnnotationLocal = useCallback((id: string, body: string) => {
    setAnnotations((current) => current.map((a) => (a.id === id ? { ...a, body } : a)));
  }, []);

  const removeAnnotation = useCallback((id: string) => {
    setAnnotations((current) => current.filter((a) => a.id !== id));
    setLocatedIds((current) => {
      if (!current.has(id)) return current;
      const next = new Set(current);
      next.delete(id);
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({
      enabled: true,
      diseaseId,
      annotationsFor,
      allAnnotations: annotations,
      locatedIds,
      reportLocated,
      addAnnotation,
      updateAnnotationLocal,
      removeAnnotation,
    }),
    [
      diseaseId,
      annotationsFor,
      annotations,
      locatedIds,
      reportLocated,
      addAnnotation,
      updateAnnotationLocal,
      removeAnnotation,
    ],
  );

  return <AnnotationContext.Provider value={value}>{children}</AnnotationContext.Provider>;
}
