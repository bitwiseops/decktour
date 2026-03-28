/**
 * instrumentation-client.ts — cattura gli errori JavaScript non gestiti nel browser
 * e li invia a /api/log perché vengano scritti nel file di log del server.
 */

window.addEventListener("error", (event) => {
  fetch("/api/log", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: event.message,
      source: `${event.filename}:${event.lineno}:${event.colno}`,
      stack: event.error?.stack,
      url: window.location.href,
    }),
  }).catch(() => {});
});

window.addEventListener("unhandledrejection", (event) => {
  const reason = event.reason;
  fetch("/api/log", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: reason instanceof Error ? reason.message : String(reason),
      stack: reason instanceof Error ? reason.stack : undefined,
      source: "unhandledrejection",
      url: window.location.href,
    }),
  }).catch(() => {});
});
