const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'packages/core/src/api/auth.ts');
let content = fs.readFileSync(file, 'utf8');

const lines = content.split('\n');

// 1. Add imports
const importIndex = lines.findIndex(l => l.includes("import passport from 'passport'"));
lines.splice(importIndex, 0, 
  "import { mfaRouter } from './auth/mfa'",
  "import { recoveryRouter } from './auth/recovery'",
  "import { ssoRouter } from './auth/sso'"
);

// We need to re-join and then do string replacements for the big blocks because line numbers shifted
content = lines.join('\n');

const mfaStart = "// ── POST /api/v1/auth/2fa/setup ────────────────────────────────────────────────";
const mfaEnd = "// ── POST /api/v1/auth/logout ─────────────────────────────────────────────────";

const mfaBlock = content.substring(content.indexOf(mfaStart), content.indexOf(mfaEnd));
content = content.replace(mfaBlock, "router.use('/2fa', mfaRouter)\n\n");

const recoveryStart = "// ── POST /api/v1/auth/forgot-password ───────────────────────────────────────";
const recoveryEnd = "// ── GET  /api/v1/auth/setup-status ───────────────────────────────────────────";

const recoveryBlock = content.substring(content.indexOf(recoveryStart), content.indexOf(recoveryEnd));
content = content.replace(recoveryBlock, "router.use('/', recoveryRouter)\n\n");

const ssoStart = "// ── SAML SSO routes ──────────────────────────────────────────────────────────";
const ssoEnd = "export default router";

const ssoBlock = content.substring(content.indexOf(ssoStart), content.indexOf(ssoEnd));
content = content.replace(ssoBlock, "router.use('/sso', ssoRouter)\n\n");

fs.writeFileSync(file, content);
console.log('auth.ts refactored successfully');
