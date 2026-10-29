// Structured JSON logging (PRD 7, Observability). One line per event so hosting
// log drains can parse it. Never log OTP codes, documents or other secrets.

export type LogLevel = "debug" | "info" | "warn" | "error";
export type LogFields = Record<string, unknown>;

type Sink = (line: string, level: LogLevel) => void;

const defaultSink: Sink = (line, level) => {
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
};

let sink: Sink = defaultSink;

// Tests swap the sink to capture output.
export function setLogSink(next: Sink | null) {
  sink = next ?? defaultSink;
}

function serializeError(err: unknown) {
  if (err instanceof Error) return { name: err.name, message: err.message, stack: err.stack };
  return { message: String(err) };
}

function write(level: LogLevel, msg: string, fields: LogFields = {}) {
  const entry: LogFields = { level, msg, time: new Date().toISOString(), ...fields };
  if ("err" in entry) entry.err = serializeError(entry.err);
  sink(JSON.stringify(entry), level);
}

export const logger = {
  debug: (msg: string, fields?: LogFields) => write("debug", msg, fields),
  info: (msg: string, fields?: LogFields) => write("info", msg, fields),
  warn: (msg: string, fields?: LogFields) => write("warn", msg, fields),
  error: (msg: string, fields?: LogFields) => write("error", msg, fields),
};
