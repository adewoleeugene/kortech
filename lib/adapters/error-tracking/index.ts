import { logger } from "@/lib/observability/logger";

// Error tracking sits behind this interface so a hosted service (Sentry etc.)
// can be added later without touching call sites (PRD 11).
export type ErrorContext = {
  source: "server" | "client" | "request";
  path?: string;
  digest?: string;
  [key: string]: unknown;
};

export interface ErrorTracker {
  captureException(error: unknown, context: ErrorContext): void;
}

export class ConsoleErrorTracker implements ErrorTracker {
  captureException(error: unknown, context: ErrorContext) {
    logger.error("exception", { err: error, ...context });
  }
}

// Collects errors in memory; for tests.
export class MemoryErrorTracker implements ErrorTracker {
  readonly captured: { error: unknown; context: ErrorContext }[] = [];
  captureException(error: unknown, context: ErrorContext) {
    this.captured.push({ error, context });
  }
}

let tracker: ErrorTracker = new ConsoleErrorTracker();

export function getErrorTracker(): ErrorTracker {
  return tracker;
}

export function setErrorTracker(next: ErrorTracker) {
  tracker = next;
}

export function captureException(error: unknown, context: ErrorContext) {
  try {
    tracker.captureException(error, context);
  } catch {
    // Reporting must never throw into the code that called it.
  }
}
