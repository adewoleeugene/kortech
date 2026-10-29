import { afterEach, describe, expect, it } from "vitest";
import { POST } from "@/app/api/client-errors/route";
import {
  ConsoleErrorTracker,
  MemoryErrorTracker,
  captureException,
  setErrorTracker,
} from "@/lib/adapters/error-tracking";
import { logger, setLogSink } from "@/lib/observability/logger";

afterEach(() => {
  setLogSink(() => {});
  setErrorTracker(new ConsoleErrorTracker());
});

describe("logger", () => {
  it("writes one JSON line with level, message, time and fields", () => {
    const lines: string[] = [];
    setLogSink((line) => lines.push(line));
    logger.info("seed complete", { districts: 16 });
    expect(lines).toHaveLength(1);
    const entry = JSON.parse(lines[0]);
    expect(entry).toMatchObject({ level: "info", msg: "seed complete", districts: 16 });
    expect(new Date(entry.time).toString()).not.toBe("Invalid Date");
  });

  it("serialises errors passed as err", () => {
    const lines: string[] = [];
    setLogSink((line) => lines.push(line));
    logger.error("boom", { err: new Error("bad thing") });
    expect(JSON.parse(lines[0]).err).toMatchObject({ name: "Error", message: "bad thing" });
  });
});

describe("error tracking hook", () => {
  it("sends exceptions to the configured tracker", () => {
    const tracker = new MemoryErrorTracker();
    setErrorTracker(tracker);
    const err = new Error("db down");
    captureException(err, { source: "server", path: "/" });
    expect(tracker.captured).toEqual([{ error: err, context: { source: "server", path: "/" } }]);
  });

  it("never throws even if the tracker fails", () => {
    setErrorTracker({
      captureException() {
        throw new Error("tracker offline");
      },
    });
    expect(() => captureException(new Error("x"), { source: "server" })).not.toThrow();
  });

  it("console tracker logs a structured error line", () => {
    const lines: string[] = [];
    setLogSink((line) => lines.push(line));
    new ConsoleErrorTracker().captureException(new Error("oops"), { source: "request", path: "/x" });
    expect(JSON.parse(lines[0])).toMatchObject({ level: "error", msg: "exception", source: "request", path: "/x" });
  });
});

describe("POST /api/client-errors", () => {
  const post = (body: unknown) =>
    POST(new Request("http://localhost/api/client-errors", { method: "POST", body: JSON.stringify(body) }));

  it("accepts a valid report and forwards it to the tracker", async () => {
    const tracker = new MemoryErrorTracker();
    setErrorTracker(tracker);
    const res = await post({ message: "render failed", path: "/guides", digest: "abc" });
    expect(res.status).toBe(204);
    expect(tracker.captured[0].context).toEqual({ source: "client", path: "/guides", digest: "abc" });
    expect((tracker.captured[0].error as Error).message).toBe("render failed");
  });

  it("rejects an invalid body with 400", async () => {
    const res = await post({ message: "" });
    expect(res.status).toBe(400);
  });
});
