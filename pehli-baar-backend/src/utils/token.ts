import crypto from "crypto";

const JWT_SECRET = process.env["JWT_SECRET"] || "pehli-baar-secret-key-12345";

/**
 * Generates a signed token (JWT HS256) for a user payload.
 * Done dependency-free using Node's built-in crypto module.
 */
export function generateToken(payload: Record<string, any>): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const data = Buffer.from(JSON.stringify({
    ...payload,
    exp: Date.now() + 30 * 24 * 60 * 60 * 1000 // 30 days expiry
  })).toString("base64url");
  
  const signature = crypto
    .createHmac("sha256", JWT_SECRET)
    .update(`${header}.${data}`)
    .digest("base64url");
    
  return `${header}.${data}.${signature}`;
}

/**
 * Verifies a signed token and returns its payload.
 * Returns null if the token signature is invalid or expired.
 */
export function verifyToken(token: string): Record<string, any> | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    
    const header = parts[0];
    const data = parts[1];
    const signature = parts[2];
    
    if (!header || !data || !signature) return null;
    
    const expectedSignature = crypto
      .createHmac("sha256", JWT_SECRET)
      .update(`${header}.${data}`)
      .digest("base64url");
      
    if (signature !== expectedSignature) return null;
    
    const payload = JSON.parse(Buffer.from(data, "base64url").toString("utf8")) as Record<string, any>;
    
    // Check expiration
    if (payload["exp"] && Date.now() > payload["exp"]) {
      return null;
    }
    
    return payload;
  } catch {
    return null;
  }
}
