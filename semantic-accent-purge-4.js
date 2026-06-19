const fs = require('fs');
const path = require('path');

const directoryPath = path.join(__dirname, 'packages', 'admin', 'src');

const replacements = [
  // ── Emerald RGBA ──────────────────────────────────────────────
  // Glows
  { regex: /shadow-\[0_0_30px_rgba\(16,185,129,0\.25\)\]/g, replacement: 'shadow-[var(--z-active-glow)]' },
  { regex: /shadow-\[0_0_6px_rgba\(16,185,129,0\.8\)\]/g, replacement: 'shadow-[var(--z-active-glow)]' },
  { regex: /shadow-\[0_0_0_3px_rgba\(16,185,129,0\.08\)\]/g, replacement: 'shadow-[var(--z-active-glow)]' },
  { regex: /shadow-\[0_0_8px_rgba\(16,185,129,0\.6\)\]/g, replacement: 'shadow-[var(--z-active-glow)]' },
  { regex: /shadow-\[0_0_18px_rgba\(16,185,129,0\.18\)\]/g, replacement: 'shadow-[var(--z-active-glow)]' },
  { regex: /shadow-\[0_0_8px_rgba\(16,185,129,0\.5\)\]/g, replacement: 'shadow-[var(--z-active-glow)]' },
  { regex: /shadow-\[0_0_8px_rgba\(16,185,129,0\.8\)\]/g, replacement: 'shadow-[var(--z-active-glow)]' },
  { regex: /shadow-\[0_0_12px_rgba\(16,185,129,0\.3\)\]/g, replacement: 'shadow-[var(--z-active-glow)]' },
  
  // Inline styles
  { regex: /background: 'rgba\(16,185,129,0\.1\)', borderColor: 'rgba\(16,185,129,0\.2\)'/g, replacement: "background: 'var(--z-active-bg)', borderColor: 'var(--z-active-border)'" },

  // ── Violet RGBA ───────────────────────────────────────────────
  // Glows
  { regex: /shadow-\[0_0_6px_rgba\(139,92,246,0\.7\)\]/g, replacement: 'shadow-[var(--z-active-glow)]' },
  { regex: /shadow-\[0_0_8px_rgba\(139,92,246,0\.8\)\]/g, replacement: 'shadow-[var(--z-active-glow)]' },
  { regex: /shadow-\[0_0_10px_rgba\(139,92,246,0\.5\)\]/g, replacement: 'shadow-[var(--z-active-glow)]' },
  { regex: /shadow-\[0_0_24px_rgba\(139,92,246,0\.25\)\]/g, replacement: 'shadow-[var(--z-active-glow)]' },
  { regex: /shadow-\[0_0_30px_rgba\(139,92,246,0\.4\)\]/g, replacement: 'shadow-[var(--z-active-glow)]' },

  // Inline styles
  { regex: /background: 'rgba\(139,92,246,0\.1\)', borderColor: 'rgba\(139,92,246,0\.2\)'/g, replacement: "background: 'var(--z-active-bg)', borderColor: 'var(--z-active-border)'" },
];

function processDirectory(dir) {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      // Exclude definition files that should keep these strings as defaults/examples
      if (file === 'BrandContext.tsx' || file === 'SettingsThemeStore.tsx') return;
      if (fullPath.includes('index.css')) return;

      let content = fs.readFileSync(fullPath, 'utf8');
      let original = content;

      replacements.forEach(r => {
        content = content.replace(r.regex, r.replacement);
      });

      if (content !== original) {
        fs.writeFileSync(fullPath, content, 'utf8');
      }
    }
  });
}

processDirectory(directoryPath);
console.log('Semantic accent rgba purge complete.');
