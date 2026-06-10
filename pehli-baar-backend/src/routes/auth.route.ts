import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import { AppError, ErrorCode } from "../types/index.js";
import { generateToken } from "../utils/token.js";

export const authRouter = Router();

// In-memory OTP cache fallback
const otpCache = new Map<string, { otp: string; expiresAt: number }>();

/**
 * POST /api/auth/send-otp
 * Body: { phone: string, name: string }
 */
authRouter.post(
  "/send-otp",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { phone, name } = req.body as { phone?: string; name?: string };

      if (!phone || !name) {
        throw new AppError(
          ErrorCode.INVALID_REQUEST,
          "Phone number and Name are required."
        );
      }

      // Clean phone number (keep digits only)
      const cleanPhone = phone.replace(/\D/g, "");
      if (cleanPhone.length !== 10) {
        throw new AppError(
          ErrorCode.INVALID_REQUEST,
          "Invalid phone number. Must be a 10-digit number."
        );
      }

      // Generate a 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();

      // Store in memory cache for 5 minutes
      const expiresAt = Date.now() + 5 * 60 * 1000;
      otpCache.set(cleanPhone, { otp, expiresAt });

      // Always print OTP to node console so user can see it in dev
      process.stderr.write(
        `\n🔑  [OTP] Real OTP generated for +91 ${cleanPhone} (${name}): ${otp}\n\n`
      );

      // Trigger Twilio SMS if credentials exist
      const sid = process.env["TWILIO_ACCOUNT_SID"];
      const token = process.env["TWILIO_AUTH_TOKEN"];
      const from = process.env["TWILIO_PHONE_NUMBER"];

      let smsSent = false;
      let smsError = "";

      if (sid && token && from) {
        try {
          const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
          const authHeader = `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`;
          const params = new URLSearchParams();
          params.append("To", `+91${cleanPhone}`);
          params.append("From", from);
          params.append("Body", `Pehli Baar: Hello ${name}, your verification OTP is ${otp}. Valid for 5 minutes.`);

          const twilioRes = await fetch(url, {
            method: "POST",
            headers: {
              Authorization: authHeader,
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: params.toString(),
          });

          if (!twilioRes.ok) {
            const errBody = await twilioRes.text();
            process.stderr.write(`⚠️  Twilio API error: ${errBody}\n`);
            smsError = `Twilio API error: ${errBody}`;
          } else {
            process.stderr.write(`✉️  Twilio SMS OTP sent to +91 ${cleanPhone}\n`);
            smsSent = true;
          }
        } catch (twilioErr) {
          const errMsg = twilioErr instanceof Error ? twilioErr.message : String(twilioErr);
          process.stderr.write(`⚠️  Failed to send Twilio SMS: ${errMsg}\n`);
          smsError = `Twilio connection error: ${errMsg}`;
        }
      } else {
        smsError = "Twilio credentials are not configured in settings.";
      }

      res.status(200).json({
        success: true,
        message: smsSent ? "OTP sent successfully." : `OTP generated in sandbox mode. ${smsError}`,
        sent: smsSent,
        error: smsSent ? undefined : smsError,
        // Return OTP in response only in dev mode for easy automated/local copy-paste testing
        otp: process.env["NODE_ENV"] !== "production" ? otp : undefined,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/auth/verify-otp
 * Body: { phone: string, otp: string, name: string }
 */
authRouter.post(
  "/verify-otp",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { phone, otp, name } = req.body as { phone?: string; otp?: string; name?: string };

      if (!phone || !otp) {
        throw new AppError(
          ErrorCode.INVALID_REQUEST,
          "Phone number and OTP code are required."
        );
      }

      const cleanPhone = phone.replace(/\D/g, "");
      const record = otpCache.get(cleanPhone);

      if (!record) {
        throw new AppError(
          ErrorCode.INVALID_REQUEST,
          "No OTP request found for this phone number."
        );
      }

      if (Date.now() > record.expiresAt) {
        otpCache.delete(cleanPhone);
        throw new AppError(
          ErrorCode.INVALID_REQUEST,
          "OTP has expired. Please request a new one."
        );
      }

      if (record.otp !== otp) {
        throw new AppError(
          ErrorCode.INVALID_REQUEST,
          "Incorrect OTP. Please enter the correct code."
        );
      }

      // Success - clear cache entry
      otpCache.delete(cleanPhone);

      const finalName = name?.trim() || "Student";

      // Generate signed JWT token
      const token = generateToken({ name: finalName, phone: cleanPhone });

      res.status(200).json({
        success: true,
        message: "OTP verified successfully.",
        token,
        name: finalName,
        phone: cleanPhone,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/auth/config
 * Returns public configuration keys needed by the frontend (like Google Client ID)
 */
authRouter.get(
  "/config",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      res.status(200).json({
        googleClientId: process.env["GOOGLE_CLIENT_ID"] ?? "",
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/auth/google
 * Body: { accessToken: string, isSandbox: boolean, name: string, email: string }
 * Verifies the Google OAuth access token and returns user details
 */
authRouter.post(
  "/google",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { accessToken, isSandbox, name, email } = req.body as {
        accessToken?: string;
        isSandbox?: boolean;
        name?: string;
        email?: string;
      };

      // 1. Sandbox simulation flow
      if (isSandbox) {
        if (process.env["NODE_ENV"] === "production") {
          throw new AppError(
            ErrorCode.UNAUTHORIZED,
            "Sandbox mode is not allowed in production."
          );
        }

        const finalName = name?.trim() || "Google Scholar";
        const finalEmail = email?.trim() || "scholar@google.com";
        const token = generateToken({ name: finalName, email: finalEmail });

        res.status(200).json({
          success: true,
          message: "Google sandbox sign-in successful.",
          token,
          name: finalName,
          email: finalEmail,
        });
        return;
      }

      // 2. Real Google Sign-in verification
      if (!accessToken) {
        throw new AppError(
          ErrorCode.INVALID_REQUEST,
          "Google access token is required."
        );
      }

      // Fetch user profile from Google UserInfo endpoint
      const googleRes = await fetch(
        `https://www.googleapis.com/oauth2/v3/userinfo?access_token=${accessToken}`
      );

      if (!googleRes.ok) {
        throw new AppError(
          ErrorCode.UNAUTHORIZED,
          "Invalid Google access token."
        );
      }

      const payload = (await googleRes.json()) as {
        name?: string;
        given_name?: string;
        family_name?: string;
        email?: string;
        email_verified?: boolean;
      };

      // Robust name extraction
      let finalName = payload.name?.trim();
      if (!finalName && payload.given_name) {
        finalName = payload.family_name 
          ? `${payload.given_name.trim()} ${payload.family_name.trim()}`
          : payload.given_name.trim();
      }
      if (!finalName) {
        finalName = payload.email ? payload.email.split("@")[0] : "Google Scholar";
      }

      const finalEmail = payload.email || "scholar@google.com";

      // Generate signed JWT token
      const token = generateToken({ name: finalName, email: finalEmail });

      res.status(200).json({
        success: true,
        message: "Google sign-in successful.",
        token,
        name: finalName,
        email: finalEmail,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/auth/setup-credentials
 * Body: { twilioSid, twilioToken, twilioFrom, googleClientId }
 * Saves credentials to the .env file and updates the in-memory config.
 */
authRouter.post(
  "/setup-credentials",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { twilioSid, twilioToken, twilioFrom, googleClientId } = req.body as {
        twilioSid?: string;
        twilioToken?: string;
        twilioFrom?: string;
        googleClientId?: string;
      };

      const updates: Record<string, string> = {};
      if (twilioSid !== undefined) updates["TWILIO_ACCOUNT_SID"] = twilioSid;
      if (twilioToken !== undefined) updates["TWILIO_AUTH_TOKEN"] = twilioToken;
      if (twilioFrom !== undefined) updates["TWILIO_PHONE_NUMBER"] = twilioFrom;
      if (googleClientId !== undefined) updates["GOOGLE_CLIENT_ID"] = googleClientId;

      const fs = await import("fs");
      const path = await import("path");
      const envPath = path.resolve(process.cwd(), ".env");

      let content = "";
      if (fs.existsSync(envPath)) {
        content = fs.readFileSync(envPath, "utf8");
      }

      for (const [key, value] of Object.entries(updates)) {
        const regex = new RegExp(`^${key}=.*$`, "m");
        if (regex.test(content)) {
          content = content.replace(regex, `${key}=${value}`);
        } else {
          content += `\n${key}=${value}`;
        }
        process.env[key] = value;
      }

      fs.writeFileSync(envPath, content.trim() + "\n", "utf8");

      res.status(200).json({
        success: true,
        message: "Credentials saved. Server is restarting.",
      });
    } catch (err) {
      next(err);
    }
  }
);
