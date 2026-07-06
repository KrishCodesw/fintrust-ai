import speakeasy from "speakeasy"
import QRCode from "qrcode"

const APP_NAME = "FinTrust-AI"

export function generateTOTPSecret(email: string) {
  return speakeasy.generateSecret({
    name: `${APP_NAME} (${email})`,
    length: 20,
  })
}

export async function generateQRCodeDataUrl(otpauthUrl: string): Promise<string> {
  return QRCode.toDataURL(otpauthUrl)
}

export function verifyTOTP(encryptedSecret: string, token: string): boolean {
  // The secret stored in DB is already decrypted by the caller before passing here.
  // Caller decrypts with lib/crypto.ts decrypt() before calling this.
  return speakeasy.totp.verify({
    secret: encryptedSecret,
    encoding: "base32",
    token,
    window: 1, // allow 30s clock skew in either direction
  })
}
