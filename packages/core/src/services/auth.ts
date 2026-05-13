import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_change_me_in_production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'fallback_refresh_secret_change_me';
const SALT_ROUNDS = 12; // increased from 10 for better security

export interface AuthUser {
  id: string;
  email: string;
  role: 'admin' | 'editor' | 'viewer';
}

export const AuthService = {
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
  },

  async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  },

  /**
   * Short-lived access token (15 minutes)
   */
  generateToken(user: AuthUser): string {
    return jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '15m' }
    );
  },

  /**
   * Long-lived refresh token (7 days)
   */
  generateRefreshToken(user: AuthUser): string {
    return jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    );
  },

  verifyToken(token: string): AuthUser | null {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as AuthUser & Record<string, unknown>;
      return { id: decoded.id, email: decoded.email, role: decoded.role };
    } catch {
      return null;
    }
  },

  verifyRefreshToken(token: string): AuthUser | null {
    try {
      const decoded = jwt.verify(token, JWT_REFRESH_SECRET) as AuthUser & Record<string, unknown>;
      return { id: decoded.id, email: decoded.email, role: decoded.role };
    } catch {
      return null;
    }
  },

  validatePassword(password: string): { valid: boolean; message?: string } {
    if (password.length < 8) {
      return { valid: false, message: 'Password must be at least 8 characters' };
    }
    if (!/[A-Z]/.test(password)) {
      return { valid: false, message: 'Password must contain at least one uppercase letter' };
    }
    if (!/[0-9]/.test(password)) {
      return { valid: false, message: 'Password must contain at least one number' };
    }
    return { valid: true };
  },
};
