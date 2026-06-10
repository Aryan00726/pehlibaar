import type { Response, NextFunction } from "express";
import { AppError, ErrorCode, type AuthenticatedRequest } from "../types/index.js";
import { verifyToken } from "../utils/token.js";

/**
 * Middleware that validates the user's session or API key.
 * 
 * 1. Checks for a JWT bearer token in the `Authorization` header.
 *    If valid, parses user details and sets `req.user`.
 * 2. Checks for `x-api-key` header matching the API_KEY environment variable.
 * 3. Falls back to a simulated developer mock session in development mode.
 */
export function authMiddleware(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers["authorization"];
  
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    
    if (decoded) {
      req.user = {
        name: decoded["name"],
        email: decoded["email"],
        phone: decoded["phone"]
      };
      next();
      return;
    } else {
      next(
        new AppError(
          ErrorCode.UNAUTHORIZED,
          "Session expired or invalid token. Please log in again."
        )
      );
      return;
    }
  }

  // Fallback to legacy API Key verification
  const apiKey = process.env["API_KEY"];
  const providedKey = req.headers["x-api-key"];

  if (apiKey && providedKey === apiKey) {
    req.user = { name: "API Client", email: "api@client.local" };
    next();
    return;
  }

  // Skip auth in local development mode to support sandbox testing
  if (process.env["NODE_ENV"] !== "production") {
    process.stderr.write("⚠️  [AUTH] No auth header or API key found. Falling back to local developer session.\n");
    req.user = { name: "Aryan", email: "aryan@example.com", phone: "9876543210" };
    next();
    return;
  }

  // Unauthorized in production if no valid credentials provided
  next(
    new AppError(
      ErrorCode.UNAUTHORIZED,
      "Authentication required. Include a valid Bearer token or x-api-key header."
    )
  );
}

