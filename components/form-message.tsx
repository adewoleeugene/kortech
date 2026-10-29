export function FormMessage({ error, notice }: { error?: string; notice?: string }) {
  if (error) {
    return (
      <p role="alert" className="rounded-lg border border-red-700 bg-red-50 px-4 py-3 text-red-800 dark:bg-red-950 dark:text-red-200">
        {error}
      </p>
    );
  }
  if (notice) {
    return (
      <p role="status" className="rounded-lg bg-brand-soft px-4 py-3">
        {notice}
      </p>
    );
  }
  return null;
}
