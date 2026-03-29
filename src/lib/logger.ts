/**
 * Server-only logger — scrive su logs/app.log in formato JSON-lines.
 * Usare solo in contesti Node.js (API routes, instrumentation.ts).
 * In Edge runtime le scritture su file vengono silenziosamente ignorate.
 */

function writeSync(level: string, message: string, data?: unknown) {
  try {
    if (typeof process === "undefined" || !process.cwd) return;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require("fs") as typeof import("fs");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = require("path") as typeof import("path");

    const LOG_FILE = path.join(process.cwd(), "logs", "app.log");
    const MAX_BYTES = 5 * 1024 * 1024;

    const dir = path.dirname(LOG_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    try {
      const stat = fs.statSync(LOG_FILE);
      if (stat.size > MAX_BYTES) fs.renameSync(LOG_FILE, LOG_FILE + ".old");
    } catch {
      // file non esiste ancora — ok
    }

    const safe =
      JSON.stringify({
        ts: new Date().toISOString(),
        level,
        msg: message,
        ...(data !== undefined
          ? { data: data instanceof Error ? { message: data.message, stack: data.stack } : data }
          : {}),
      }) + "\n";
    fs.appendFileSync(LOG_FILE, safe, "utf8");
  } catch {
    // fallback silenzioso
  }
}

export function log(message: string, data?: unknown) {
  console.log(`[INFO]  ${message}`, data ?? "");
  writeSync("INFO", message, data);
}

export function warn(message: string, data?: unknown) {
  console.warn(`[WARN]  ${message}`, data ?? "");
  writeSync("WARN", message, data);
}

export function error(message: string, data?: unknown) {
  console.error(`[ERROR] ${message}`, data ?? "");
  writeSync("ERROR", message, data);
}

export function logRequest(method: string, path: string, status: number, ms: number) {
  writeSync(status >= 500 ? "ERROR" : status >= 400 ? "WARN" : "INFO", "HTTP", {
    method,
    path,
    status,
    ms,
  });
}
