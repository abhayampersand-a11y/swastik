const SECRET = process.env.SESSION_SECRET ?? "dev-secret"
const SESSION_DAYS = 7

export const SESSION_COOKIE = "swastik_session"

function b64url(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf)
  let str = ""
  for (const b of bytes) str += String.fromCharCode(b)
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

async function hmacKey(): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  )
}

export async function createSession(username: string): Promise<string> {
  const payload = b64url(
    new TextEncoder().encode(
      JSON.stringify({ u: username, exp: Date.now() + SESSION_DAYS * 86400_000 })
    )
  )
  const sig = await crypto.subtle.sign("HMAC", await hmacKey(), new TextEncoder().encode(payload))
  return `${payload}.${b64url(sig)}`
}

export async function verifySession(token: string | undefined): Promise<boolean> {
  if (!token) return false
  const [payload, sig] = token.split(".")
  if (!payload || !sig) return false

  const expected = b64url(
    await crypto.subtle.sign("HMAC", await hmacKey(), new TextEncoder().encode(payload))
  )
  if (sig !== expected) return false

  try {
    const data = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")))
    return typeof data.exp === "number" && data.exp > Date.now()
  } catch {
    return false
  }
}
