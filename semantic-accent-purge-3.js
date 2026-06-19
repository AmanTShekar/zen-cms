const fs = require('fs');
const path = require('path');

const directoryPath = path.join(__dirname, 'packages', 'admin', 'src');

const replacements = [
  // Hex Colors
  { regex: /#10b981/g, replacement: 'var(--z-accent)' },
  { regex: /#10B981/g, replacement: 'var(--z-accent)' },
  { regex: /#8b5cf6/g, replacement: 'var(--z-accent)' },
  { regex: /#8B5CF6/g, replacement: 'var(--z-accent)' },

  // Shadow strings
  { regex: /shadow-\[0_0_[0-9]+px_var\(--z-accent\)\]/g, replacement: 'shadow-[var(--z-active-glow)]' },

  // Inline styling strings that might have gotten 'var(--z-accent)' in weird ways
  { regex: /'var\(--z-accent\)'/g, replacement: "'var(--z-accent)'" },
];

function processDirectory(dir) {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts') || fullPath.endsWith('.css')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let original = content;

      replacements.forEach(r => {
        content = content.replace(r.regex, r.replacement);
      });

      // Special handling for DashboardLayout dev env shadow
      content = content.replace(/shadow-\[0_0_8px_#10b981\]/g, 'shadow-[var(--z-active-glow)]');
      content = content.replace(/shadow-\[0_0_8px_#8b5cf6\]/g, 'shadow-[var(--z-active-glow)]');
      content = content.replace(/shadow-\[0_0_8px_#f59e0b\]/g, 'shadow-[var(--z-active-glow)]');
      content = content.replace(/shadow-\[0_0_8px_#a855f7\]/g, 'shadow-[var(--z-active-glow)]');
      content = content.replace(/shadow-\[0_0_6px_var\(--z-accent\)\]/g, 'shadow-[var(--z-active-glow)]');
      content = content.replace(/shadow-\[0_0_8px_var\(--z-accent\)\]/g, 'shadow-[var(--z-active-glow)]');
      content = content.replace(/shadow-\[0_0_10px_var\(--z-accent\)\]/g, 'shadow-[var(--z-active-glow)]');
      content = content.replace(/shadow-\[0_0_15px_var\(--z-accent\)\]/g, 'shadow-[var(--z-active-glow)]');

      if (content !== original) {
        fs.writeFileSync(fullPath, content, 'utf8');
      }
    }
  });
}

processDirectory(directoryPath);
console.log('Semantic accent hex purge complete.');
