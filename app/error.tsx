"use client";

// Shown when a page or form action fails. Forms check their own fields before
// submitting, so reaching this usually means a record changed or a permission check refused.
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="py-16 text-center">
      <h1 className="text-xl font-semibold">Something went wrong</h1>
      <p className="mt-2 text-muted">The change was not saved. Reload and try again, or ask an admin if you were deleting a record.</p>
      <button type="button" onClick={reset} className="mt-4 cursor-pointer text-accent hover:text-accent-hover">Try again</button>
    </div>
  );
}
