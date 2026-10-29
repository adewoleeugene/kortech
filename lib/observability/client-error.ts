import { z } from "zod";

// Payload the browser sends to /api/client-errors from error boundaries.
export const clientErrorSchema = z.object({
  message: z.string().min(1).max(1000),
  digest: z.string().max(200).optional(),
  path: z.string().max(500).optional(),
});

export type ClientErrorReport = z.infer<typeof clientErrorSchema>;

export function reportClientError(error: Error & { digest?: string }) {
  const body: ClientErrorReport = {
    message: (error.message || "Unknown error").slice(0, 1000),
    digest: error.digest,
    path: typeof window !== "undefined" ? window.location.pathname : undefined,
  };
  // keepalive lets the report finish if the user navigates away.
  fetch("/api/client-errors", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    keepalive: true,
  }).catch(() => {});
}
