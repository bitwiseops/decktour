/**
 * Server-only logger — scrive su logs/app.log in formato JSON-lines.
 * Usare solo in contesti Node.js (API routes, instrumentation.ts).
 */
import fs from "fs";
import path from "path";

const LOG_FILE = path.join(process.cwd(), "logs", "app.log");
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB — ruota automaticamente

function ensureDir() {
  const dir = path.dirname(LOG_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function rotate() {
  try {
    const stat = fs.statSync(LOG_FILE);
    if (stat.size > MAX_BYTES) {
      fs.renameSync(LOG_FILE, LOG_FILE + ".old");
    }
  } catch {
    // file non esiste ancora — ok
  }
}

function write(level: string, message: string, data?: unknown) {
  try {
    ensureDir();
    rotate();
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
    // fallback silenzioso: non vogliamo che il logger rompa l'app
  }
}

export function log(message: string, data?: unknown) {
  console.log(`[INFO]  ${message}`, data ?? "");
  write("INFO", message, data);
}

export function warn(message: string, data?: unknown) {
  console.warn(`[WARN]  ${message}`, data ?? "");
  write("WARN", message, data);
}

export function error(message: string, data?: unknown) {
  console.error(`[ERROR] ${message}`, data ?? "");
  write("ERROR", message, data);
}

export function logRequest(method: string, path: string, status: number, ms: number) {
  write(status >= 500 ? "ERROR" : status >= 400 ? "WARN" : "INFO", "HTTP", {
    method,
    path,
    status,
    ms,
  });
}
