import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { MemberModel } from '../database/member-model';
import { createResponse } from './utils';
import { InvalidPayloadError, NotFoundError, UnauthorizedError } from '../errors';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'zenith-member-secret-key-12345';

// ── Register ─────────────────────────────────────────────────────────────────
router.post('/register', async (req: Request, res: Response, next) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password) throw new InvalidPayloadError('Email and password are required');

    const existing = await MemberModel.findOne({ email });
    if (existing) throw new InvalidPayloadError('Email already registered');

    const member = await MemberModel.create({ email, password, name });
    
    const token = jwt.sign({ id: member._id, type: 'member' }, JWT_SECRET, { expiresIn: '30d' });

    res.status(201).json(createResponse({
      token,
      member: {
        id: member._id,
        email: member.email,
        name: member.name,
        isSubscribed: member.isSubscribed
      }
    }));
  } catch (err) { next(err); }
});

// ── Login ────────────────────────────────────────────────────────────────────
router.post('/login', async (req: Request, res: Response, next) => {
  try {
    const { email, password } = req.body;
    const member = await MemberModel.findOne({ email }).select('+password');
    
    if (!member || !(await member.comparePassword(password))) {
      throw new UnauthorizedError('Invalid credentials');
    }

    member.lastLogin = new Date();
    await member.save();

    const token = jwt.sign({ id: member._id, type: 'member' }, JWT_SECRET, { expiresIn: '30d' });

    res.json(createResponse({
      token,
      member: {
        id: member._id,
        email: member.email,
        name: member.name,
        isSubscribed: member.isSubscribed
      }
    }));
  } catch (err) { next(err); }
});

// ── Get Me ───────────────────────────────────────────────────────────────────
router.get('/me', async (req: Request, res: Response, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) throw new UnauthorizedError();
    
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    const member = await MemberModel.findById(decoded.id);
    if (!member) throw new NotFoundError('Member', decoded.id);

    res.json(createResponse(member));
  } catch (err) { next(err); }
});

export default router;
