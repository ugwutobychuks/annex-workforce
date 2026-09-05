/**
 * Browser SHA-256 hex hash — matches the server implementation in
 * convex/lib/hash.ts so signatures signed on Convex verify locally
 * against the same values.
 */
export async function sha256Hex(input: string): Promise<string> {
  const enc = new TextEncoder();
  const buf = await crypto.subtle.digest("SHA-256", enc.encode(input));
  const bytes = new Uint8Array(buf);
  let hex = "";
  for (const b of bytes) hex += b.toString(16).padStart(2, "0");
  return hex;
}
