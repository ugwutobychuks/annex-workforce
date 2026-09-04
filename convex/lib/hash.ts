/**
 * SHA-256 hex hash — works in the Convex V8 runtime via Web Crypto.
 * We intentionally keep this tiny and dependency-free so it can be called
 * from any mutation without pulling `node`.
 */
export async function sha256Hex(input: string): Promise<string> {
  const enc = new TextEncoder();
  const buf = await crypto.subtle.digest("SHA-256", enc.encode(input));
  const bytes = new Uint8Array(buf);
  let hex = "";
  for (const b of bytes) hex += b.toString(16).padStart(2, "0");
  return hex;
}
