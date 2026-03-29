import { NextRequest } from "next/server";
import { verifyToken } from "./supabase";

/**
 * Extract and verify the Bearer token from a request.
 * Returns the Supabase user or null if not authenticated.
 */
export async function getAuthUser(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  return verifyToken(token);
}

/**
 * Same as getAuthUser but throws a 401 response if not authenticated.
 * Use in API routes that require auth.
 */
export async function requireAuth(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) throw new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  return user;
}
