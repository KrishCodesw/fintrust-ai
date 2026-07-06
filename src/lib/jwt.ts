import { SignJWT, jwtVerify, importPKCS8, importSPKI } from "jose"

// RS256 — private key signs, public key verifies.
// Keys are PEM strings stored in env vars.
// Generate once: openssl genrsa -out private.pem 2048 && openssl rsa -in private.pem -pubout -out public.pem

function getPrivateKey() {
  const key = process.env.JWT_PRIVATE_KEY
  if (!key) throw new Error("JWT_PRIVATE_KEY is not set")
  // Vercel stores multiline env vars with literal \n — replace back to newlines
  return importPKCS8(key.replace(/\\n/g, "\n"), "RS256")
}

function getPublicKey() {
  const key = process.env.JWT_PUBLIC_KEY
  if (!key) throw new Error("JWT_PUBLIC_KEY is not set")
  return importSPKI(key.replace(/\\n/g, "\n"), "RS256")
}

export interface AccessTokenPayload {
  userId: string
  role: string
  sessionId: string
}

export async function signAccessToken(payload: AccessTokenPayload): Promise<string> {
  const privateKey = await getPrivateKey()
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "RS256" })
    .setIssuedAt()
    .setExpirationTime("15m")
    .setIssuer("dispute-resolve")
    .setAudience("dispute-resolve-api")
    .sign(privateKey)
}

export async function verifyAccessToken(token: string): Promise<AccessTokenPayload> {
  const publicKey = await getPublicKey()
  const { payload } = await jwtVerify(token, publicKey, {
    issuer: "dispute-resolve",
    audience: "dispute-resolve-api",
  })
  return payload as unknown as AccessTokenPayload
}
