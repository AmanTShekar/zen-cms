const fs = require('fs');
const path = require('path');

const directoryPath = path.join(__dirname, 'packages', 'admin', 'src');

const replacements = [
  // Box shadows (glows)
  { regex: /shadow-\[0_[0-9]+px_[0-9]+px_rgba\([0-9]+,[0-9]+,[0-9]+,0\.[0-9]+\)\]/g, replacement: 'shadow-[var(--z-active-glow)]' },
  { regex: /shadow-\[0_0_20px_rgba\([0-9]+,[0-9]+,[0-9]+,0\.[0-9]+\)\]/g, replacement: 'shadow-[var(--z-active-glow)]' },
  { regex: /shadow-\[0_0_15px_rgba\([0-9]+,[0-9]+,[0-9]+,0\.[0-9]+\)\]/g, replacement: 'shadow-[var(--z-active-glow)]' },

  // Backgrounds
  { regex: /bg-violet-600\/10/g, replacement: 'bg-z-active-bg' },
  { regex: /bg-violet-500\/10/g, replacement: 'bg-z-active-bg' },
  { regex: /bg-emerald-600\/10/g, replacement: 'bg-z-active-bg' },
  { regex: /bg-emerald-500\/10/g, replacement: 'bg-z-active-bg' },
  { regex: /bg-indigo-600\/10/g, replacement: 'bg-z-active-bg' },
  
  { regex: /hover:bg-violet-500\/20/g, replacement: 'hover:bg-z-active-bg' },
  { regex: /hover:bg-emerald-500\/20/g, replacement: 'hover:bg-z-active-bg' },

  { regex: /hover:bg-violet-500/g, replacement: 'hover:opacity-90' },
  { regex: /hover:bg-emerald-500/g, replacement: 'hover:opacity-90' },
  { regex: /hover:bg-indigo-500/g, replacement: 'hover:opacity-90' },
  { regex: /hover:bg-blue-500/g, replacement: 'hover:opacity-90' },
  
  { regex: /bg-violet-600/g, replacement: 'bg-z-accent' },
  { regex: /bg-emerald-600/g, replacement: 'bg-z-accent' },
  { regex: /bg-indigo-600/g, replacement: 'bg-z-accent' },
  { regex: /bg-blue-600/g, replacement: 'bg-z-accent' },

  { regex: /bg-violet-500/g, replacement: 'bg-z-accent' },
  { regex: /bg-emerald-500/g, replacement: 'bg-z-accent' },
  { regex: /bg-indigo-500/g, replacement: 'bg-z-accent' },
  { regex: /bg-blue-500/g, replacement: 'bg-z-accent' },
  { regex: /bg-violet-50/g, replacement: 'bg-z-active-bg' },
  { regex: /bg-emerald-50/g, replacement: 'bg-z-active-bg' },

  // Text
  { regex: /text-violet-400/g, replacement: 'text-z-active-text' },
  { regex: /text-emerald-400/g, replacement: 'text-z-active-text' },
  { regex: /text-indigo-400/g, replacement: 'text-z-active-text' },
  
  { regex: /text-violet-500/g, replacement: 'text-z-active-text' },
  { regex: /text-emerald-500/g, replacement: 'text-z-active-text' },
  { regex: /text-indigo-500/g, replacement: 'text-z-active-text' },
  { regex: /text-blue-500/g, replacement: 'text-z-active-text' },

  { regex: /text-violet-600/g, replacement: 'text-z-accent' },
  { regex: /text-emerald-600/g, replacement: 'text-z-accent' },
  { regex: /text-indigo-600/g, replacement: 'text-z-accent' },
  { regex: /text-violet-700/g, replacement: 'text-z-accent' },

  { regex: /hover:text-violet-400/g, replacement: 'hover:text-z-active-text' },
  { regex: /hover:text-violet-500/g, replacement: 'hover:text-z-active-text' },
  { regex: /hover:text-emerald-500/g, replacement: 'hover:text-z-active-text' },
  { regex: /hover:text-indigo-500/g, replacement: 'hover:text-z-active-text' },

  // Borders & Rings
  { regex: /border-violet-500\/30/g, replacement: 'border-z-active-border' },
  { regex: /border-emerald-500\/30/g, replacement: 'border-z-active-border' },
  { regex: /border-violet-500\/20/g, replacement: 'border-z-active-border' },
  { regex: /border-violet-500\/40/g, replacement: 'border-z-active-border' },

  { regex: /hover:border-violet-500\/30/g, replacement: 'hover:border-z-active-border' },
  { regex: /hover:border-emerald-500\/30/g, replacement: 'hover:border-z-active-border' },

  { regex: /border-violet-500/g, replacement: 'border-z-accent' },
  { regex: /border-emerald-500/g, replacement: 'border-z-accent' },
  { regex: /border-indigo-500/g, replacement: 'border-z-accent' },
  { regex: /border-blue-500/g, replacement: 'border-z-accent' },

  { regex: /border-violet-400/g, replacement: 'border-z-active-border' },
  { regex: /border-emerald-400/g, replacement: 'border-z-active-border' },

  { regex: /hover:border-violet-500/g, replacement: 'hover:border-z-accent' },
  { regex: /hover:border-emerald-500/g, replacement: 'hover:border-z-accent' },
  { regex: /hover:border-indigo-500/g, replacement: 'hover:border-z-accent' },

  { regex: /focus:border-violet-500\/50/g, replacement: 'focus:border-z-accent' },
  { regex: /focus:border-violet-500\/40/g, replacement: 'focus:border-z-accent' },
  { regex: /focus:border-emerald-500\/50/g, replacement: 'focus:border-z-accent' },

  { regex: /focus:border-violet-500/g, replacement: 'focus:border-z-accent' },
  { regex: /focus:border-emerald-500/g, replacement: 'focus:border-z-accent' },
  { regex: /focus:border-indigo-500/g, replacement: 'focus:border-z-accent' },
  { regex: /focus:border-blue-500/g, replacement: 'focus:border-z-accent' },

  { regex: /focus-visible:ring-violet-500\/50/g, replacement: 'focus-visible:ring-z-active-border' },
  { regex: /focus-visible:ring-emerald-500\/50/g, replacement: 'focus-visible:ring-z-active-border' },

  { regex: /ring-violet-500\/50/g, replacement: 'ring-z-active-border' },
  { regex: /ring-emerald-500\/50/g, replacement: 'ring-z-active-border' },

  // Group Hovers
  { regex: /group-hover:text-violet-500/g, replacement: 'group-hover:text-z-active-text' },
  { regex: /group-hover:text-emerald-500/g, replacement: 'group-hover:text-z-active-text' },
  { regex: /group-hover:text-indigo-500/g, replacement: 'group-hover:text-z-active-text' },
];

function processDirectory(dir) {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let original = content;

      replacements.forEach(r => {
        content = content.replace(r.regex, r.replacement);
      });

      if (content !== original) {
        fs.writeFileSync(fullPath, content, 'utf8');
        // console.log('Updated accents in:', fullPath);
      }
    }
  });
}

processDirectory(directoryPath);
console.log('Semantic accent purge complete.');
