export function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="text-sm font-semibold text-red-700 dark:text-red-300">
      {message}
    </p>
  );
}
