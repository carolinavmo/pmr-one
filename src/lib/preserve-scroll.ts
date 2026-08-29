// Every field's onSave ultimately runs a Server Action that calls
// revalidatePath() (see revalidation.ts) — Next.js then automatically
// refreshes this route's Server Components as part of resolving that
// action. That refresh can restructure enough of the page that the
// browser's native scroll handling doesn't reliably keep you where you
// were reading (reported as "clicking Save jumps to another section").
// Capturing scrollY before the mutation and restoring it once the
// refreshed content has painted undoes that drift regardless of what
// changed — two animation frames: one for React's commit of the
// refreshed tree, one for the browser's own layout/paint of it, since
// a single frame isn't reliably enough for both to have landed.
export async function preserveScrollAcrossSave<T>(save: () => Promise<T>): Promise<T> {
  const y = window.scrollY;
  try {
    return await save();
  } finally {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (Math.abs(window.scrollY - y) > 1) {
          window.scrollTo(0, y);
        }
      });
    });
  }
}
