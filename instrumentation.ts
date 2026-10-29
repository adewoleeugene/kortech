import type { Instrumentation } from "next";
import { captureException } from "@/lib/adapters/error-tracking";

// Next.js calls this for every uncaught server error (route handlers, server components, actions).
export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  captureException(error, {
    source: "request",
    path: request.path,
    method: request.method,
    routerKind: context.routerKind,
    routePath: context.routePath,
    routeType: context.routeType,
  });
};
