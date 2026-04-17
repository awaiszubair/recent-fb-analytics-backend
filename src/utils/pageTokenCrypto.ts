import crypto from "crypto";
import { Environment } from "../config/environment";

const getKey = (): Buffer => {
  const secret = Environment.pageTokenEncryptionSecret;

  if (!secret) {
    throw new Error("PAGE_TOKEN_ENCRYPTION_SECRET or FB_APP_SECRET is required for page token encryption");
  }

  return crypto.createHash("sha256").update(secret).digest();
};

export const encryptPageToken = (plainText: string): string => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [iv.toString("base64"), authTag.toString("base64"), encrypted.toString("base64")].join(".");
};

export const decryptPageToken = (encryptedText: string): string => {
  const [ivText, authTagText, dataText] = encryptedText.split(".");

  if (!ivText || !authTagText || !dataText) {
    throw new Error("Invalid encrypted page token format");
  }

  const decipher = crypto.createDecipheriv("aes-256-gcm", getKey(), Buffer.from(ivText, "base64"));
  decipher.setAuthTag(Buffer.from(authTagText, "base64"));

  return Buffer.concat([decipher.update(Buffer.from(dataText, "base64")), decipher.final()]).toString("utf8");
};
