import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { UserModel } from '../database/user-model';
import { PasswordResetModel } from '../database/password-reset-model';
import { AuthService } from '../services/auth';
import { EmailService } from '../services/email';
import { requireAuth } from '../middleware/auth';
import { createResponse } from './utils';
import {
  AuthenticationError,
  InvalidPayloadError,
  NotFoundError,
  InvalidTokenError,
} from '../errors';
import rateLimit from 'express-rate-limit';

const router: Router = Router();

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false });

// ── POST /api/v1/auth/login ──────────────────────────────────────────────────
router.post('/login', authLimiter, async (req: Request, res: Response, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) throw new InvalidPayloadError('Email and password are required');

    const user = await UserModel.findOne({ email: email.toLowerCase() });

    // Constant-time dummy to prevent timing attacks
    if (!user) {
      await AuthService.comparePassword('dummy', '$2b$12$AAAAAAAAAAAAAAAAAAAAAA.AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA');
      throw new AuthenticationError();
    }

    const valid = await AuthService.comparePassword(password, user.password);
    if (!valid) throw new AuthenticationError();

    const payload = { id: user._id.toString(), email: user.email, role: user.role };
    const accessToken = AuthService.generateToken(payload);
    const refreshToken = AuthService.generateRefreshToken(payload);

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true, secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict', maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json(createResponse({ user: payload, accessToken }));
  } catch (err) { next(err); }
});

// ── POST /api/v1/auth/register ───────────────────────────────────────────────
router.post('/register', authLimiter, async (req: Request, res: Response, next) => {
  try {
    const { email, password, role } = req.body;
    if (!email || !password) throw new InvalidPayloadError('Email and password are required');

    const existing = await UserModel.findOne({ email: email.toLowerCase() });
    if (existing) throw new InvalidPayloadError('User already exists');

    const check = AuthService.validatePassword(password);
    if (!check.valid) throw new InvalidPayloadError(check.message!);

    const hashed = await AuthService.hashPassword(password);
    const user = await UserModel.create({ email: email.toLowerCase(), password: hashed, role: role || 'editor' });

    const payload = { id: user._id.toString(), email: user.email, role: user.role };
    const accessToken = AuthService.generateToken(payload);
    const refreshToken = AuthService.generateRefreshToken(payload);

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true, secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict', maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    await EmailService.sendWelcomeEmail(user.email, user.email.split('@')[0]);
    res.status(201).json(createResponse({ user: payload, accessToken }));
  } catch (err) { next(err); }
});

// ── POST /api/v1/auth/refresh ────────────────────────────────────────────────
router.post('/refresh', async (req: Request, res: Response, next) => {
  try {
    const token = req.cookies?.refreshToken;
    if (!token) throw new InvalidTokenError();

    const decoded = AuthService.verifyRefreshToken(token);
    if (!decoded) throw new InvalidTokenError();

    const user = await UserModel.findById(decoded.id);
    if (!user) throw new NotFoundError('User');

    const payload = { id: user._id.toString(), email: user.email, role: user.role };
    const newAccess = AuthService.generateToken(payload);
    const newRefresh = AuthService.generateRefreshToken(payload);

    res.cookie('refreshToken', newRefresh, {
      httpOnly: true, secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict', maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json(createResponse({ accessToken: newAccess }));
  } catch (err) { next(err); }
});

// ── POST /api/v1/auth/logout ─────────────────────────────────────────────────
router.post('/logout', requireAuth, (req: Request, res: Response) => {
  res.clearCookie('refreshToken', { httpOnly: true, sameSite: 'strict' });
  res.json(createResponse({ success: true }));
});

// ── GET  /api/v1/auth/me ─────────────────────────────────────────────────────
router.get('/me', requireAuth, async (req: Request, res: Response, next) => {
  try {
    const user = await UserModel.findById((req as unknown).user.id).select('-password');
    if (!user) throw new NotFoundError('User');
    res.json(createResponse({ id: user._id, email: user.email, role: user.role }));
  } catch (err) { next(err); }
});

// ── POST /api/v1/auth/forgot-password ───────────────────────────────────────
router.post('/forgot-password', authLimiter, async (req: Request, res: Response, next) => {
  try {
    const { email } = req.body;
    if (!email) throw new InvalidPayloadError('Email is required');

    const user = await UserModel.findOne({ email: email.toLowerCase() });
    // Always respond 200 — never reveal if email exists (security)
    if (!user) return res.json(createResponse({ message: 'If that email exists, a reset link has been sent.' }));

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await PasswordResetModel.deleteMany({ userId: user._id }); // Clear old tokens
    await PasswordResetModel.create({ userId: user._id, token, expiresAt });

    const resetUrl = `${process.env.ADMIN_URL || 'http://localhost:5173'}/reset-password?token=${token}`;
    await EmailService.sendPasswordResetEmail(user.email, resetUrl);

    res.json(createResponse({ message: 'If that email exists, a reset link has been sent.' }));
  } catch (err) { next(err); }
});

// ── POST /api/v1/auth/reset-password ─────────────────────────────────────────
router.post('/reset-password', authLimiter, async (req: Request, res: Response, next) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) throw new InvalidPayloadError('Token and password are required');

    const record = await PasswordResetModel.findOne({ token, used: false });
    if (!record || record.expiresAt < new Date()) throw new InvalidTokenError();

    const check = AuthService.validatePassword(password);
    if (!check.valid) throw new InvalidPayloadError(check.message!);

    const hashed = await AuthService.hashPassword(password);
    await UserModel.findByIdAndUpdate(record.userId, { password: hashed });
    await PasswordResetModel.findByIdAndUpdate(record._id, { used: true });

    res.json(createResponse({ message: 'Password reset successfully.' }));
  } catch (err) { next(err); }
});

export default router;
