import { Router } from 'express';
import express from 'express';
import path from 'path';
import fs from 'fs';

const router: Router = Router();

/**
 * Zenith Media Router
 * ──────────────────
 * Serves uploaded files with security checks.
 */

// Simple static serving for now
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);

router.use('/', express.static(uploadsDir));

export default router;
