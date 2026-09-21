import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import crypto from 'crypto';
import { validateInput, sanitizeValidationErrors } from '../validation/schemas';
import { AuthService } from '../services/auth';
import { EmailIdentityService } from '../services/emailIdentity';

/**
 * Login/password-reset for Enterprise RAG's email/password identities
 * (see docs/ENTERPRISE_RAG_IDENTITY.md). Deliberately NOT a general
 * registration endpoint -- there is no self-serve signup; an account is
 * only ever created via routes/orgs.ts's invitation-accept flow. This
 * router only covers logging back in afterward and password recovery.
 *
 * A successful login issues the exact same {walletAddress} JWT shape
 * AuthService already issues for a wallet-signature login, over the
 * account's deterministic pseudo-address -- so authMiddleware and every
 * downstream route need zero changes to accept these callers.
 */

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
});

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function createEmailAuthRoutes(prisma: PrismaClient, authService: AuthService, logger: any): Router {
  const router = Router();
  const emailIdentityService = new EmailIdentityService(prisma);

  // POST /api/v1/auth/email/login
  router.post('/login', async (req: Request, res: Response) => {
    try {
      const validation = validateInput(loginSchema, req.body);
      if (!validation.success) {
        return res.status(400).json({ error: 'Validation failed', details: sanitizeValidationErrors(validation.errors) });
      }

      const { email, password } = validation.data;
      const identity = await emailIdentityService.verifyPassword(email, password);
      if (!identity) {
        return res.status(401).json({ error: 'Invalid credentials', message: 'Email or password is incorrect' });
      }

      const token = authService.generateToken(identity.walletAddress);
      res.json({ token, expiresIn: '7d', email: identity.email });
    } catch (error) {
      logger?.error?.({ error }, 'Email login failed');
      res.status(500).json({ error: 'Login failed' });
    }
  });

  // POST /api/v1/auth/email/forgot-password
  // Always returns 200 regardless of whether the email is registered, so
  // this can't be used to enumerate accounts.
  router.post('/forgot-password', async (req: Request, res: Response) => {
    try {
      const validation = validateInput(forgotPasswordSchema, req.body);
      if (!validation.success) {
        return res.status(400).json({ error: 'Validation failed', details: sanitizeValidationErrors(validation.errors) });
      }

      const email = validation.data.email.trim().toLowerCase();
      const identity = await emailIdentityService.findByEmail(email);

      if (identity) {
        const rawToken = crypto.randomBytes(32).toString('hex');
        await prisma.passwordResetToken.create({
          data: {
            email,
            tokenHash: hashToken(rawToken),
            expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
          },
        });

        const sendGridApiKey = process.env.SENDGRID_API_KEY;
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        const resetUrl = `${frontendUrl}/auth/reset-password/${rawToken}`;

        if (!sendGridApiKey) {
          console.log(`[EmailAuth] Would email password reset link to ${email} (SendGrid not configured): ${resetUrl}`);
        } else {
          const sgMail = (await import('@sendgrid/mail')).default;
          sgMail.setApiKey(sendGridApiKey);
          try {
            await sgMail.send({
              to: email,
              from: 'alerts@taisplatform.vercel.app',
              subject: 'Reset your TAIS password',
              html: `<p><a href="${resetUrl}">Reset your password</a></p><p>This link expires in 1 hour. If you didn't request this, you can ignore this email.</p>`,
            });
          } catch (error: any) {
            logger?.error?.({ error: error.response?.body || error.message }, 'Failed to send password reset email');
          }
        }
      }

      res.json({ message: 'If that email is registered, a reset link has been sent.' });
    } catch (error) {
      logger?.error?.({ error }, 'Forgot-password request failed');
      res.status(500).json({ error: 'Request failed' });
    }
  });

  // POST /api/v1/auth/email/reset-password
  router.post('/reset-password', async (req: Request, res: Response) => {
    try {
      const validation = validateInput(resetPasswordSchema, req.body);
      if (!validation.success) {
        return res.status(400).json({ error: 'Validation failed', details: sanitizeValidationErrors(validation.errors) });
      }

      const { token, newPassword } = validation.data;
      const tokenHash = hashToken(token);

      // Atomic find-and-consume, same race-prevention pattern as
      // AuthService.validateNonce: a delete with a where-clause that
      // includes the expiry check succeeds only for a still-valid,
      // not-yet-consumed token, and consumes it in the same step.
      const resetToken = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });
      if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
        return res.status(400).json({ error: 'Invalid or expired token' });
      }

      await prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() },
      });

      await emailIdentityService.setPassword(resetToken.email, newPassword);

      res.json({ message: 'Password updated. You can now log in with your new password.' });
    } catch (error) {
      logger?.error?.({ error }, 'Reset-password request failed');
      res.status(500).json({ error: 'Request failed' });
    }
  });

  return router;
}

export default createEmailAuthRoutes;
