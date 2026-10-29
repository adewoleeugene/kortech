import { setLogSink } from "@/lib/observability/logger";

// Keep test output readable; tests that check logging install their own sink.
setLogSink(() => {});
