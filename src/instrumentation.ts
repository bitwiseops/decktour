import type { Instrumentation } from "next";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { error } = await import("./lib/logger");

    // Avvia il server — manda un segnale al log
    const { log } = await import("./lib/logger");
    log("Server avviato", { pid: process.pid, nodeVersion: process.version, env: process.env.NODE_ENV });

    // Cattura promise non gestite
    process.on("unhandledRejection", (reason) => {
      error("unhandledRejection", reason instanceof Error ? reason : String(reason));
    });

    // Cattura eccezioni non gestite
    process.on("uncaughtException", (err) => {
      error("uncaughtException", err);
    });
  }
}

/**
 * onRequestError viene chiamato automaticamente da Next.js per OGNI errore
 * che avviene durante la gestione di una richiesta (API routes, Server Components…).
 * Non è necessario aggiungere try/catch nelle singole route.
 */
export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  // Dynamic import per evitare che il modulo fs venga incluso nel bundle Edge
  const { error } = await import("./lib/logger");
  error(`${context.routeType} ${request.method} ${request.path}`, {
    message: (err as Error).message,
    stack: (err as Error).stack,
    routePath: context.routePath,
    routerKind: context.routerKind,
  });
};
