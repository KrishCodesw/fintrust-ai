import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto"

// AES-256-GCM encryption for TOTP secrets stored in DB.
// Key is a 32-byte hex string stored in TOTP_ENCRYPTION_KEY env var.
// Generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

function getKey(): Buffer {
  const hex = process.env.TOTP_ENCRYPTION_KEY
  if (!hex) throw new Error("TOTP_ENCRYPTION_KEY is not set")
  if (hex.length !== 64) throw new Error("TOTP_ENCRYPTION_KEY must be a 64-character hex string (32 bytes)")
  return Buffer.from(hex, "hex")
}

export function encrypt(plaintext: string): string {
  const key = getKey()
  const iv = randomBytes(16)
  const cipher = createCipheriv("aes-256-gcm", key, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()])
  const authTag = cipher.getAuthTag()
  // Format: iv:authTag:ciphertext — all hex-encoded
  return [iv, authTag, encrypted].map((b) => b.toString("hex")).join(":")
}

export function decrypt(stored: string): string {
  const key = getKey()
  const [ivHex, tagHex, ctHex] = stored.split(":")
  if (!ivHex || !tagHex || !ctHex) throw new Error("Invalid encrypted value format")
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivHex, "hex"))
  decipher.setAuthTag(Buffer.from(tagHex, "hex"))
  return (
    decipher.update(Buffer.from(ctHex, "hex")).toString("utf8") +
    decipher.final("utf8")
  )
}
