const fs = require('fs');
const path = require('path');

const directoryPath = path.join(__dirname, 'packages', 'admin', 'src');

function replacer(match, prefix, color, shade, opacity) {
  const shadeNum = parseInt(shade, 10);
  
  if (prefix === 'text') {
    return shadeNum >= 600 ? 'text-z-accent' : (shadeNum >= 300 ? 'text-z-active-text' : 'text-z-muted');
  }
  if (prefix === 'bg') {
    if (opacity || shadeNum <= 200) return 'bg-z-active-bg';
    return 'bg-z-accent';
  }
  if (prefix === 'border') {
    if (opacity || shadeNum <= 400) return 'border-z-active-border';
    return 'border-z-accent';
  }
  if (prefix === 'hover:bg') {
    if (shadeNum <= 200) return 'hover:bg-z-active-bg';
    return 'hover:opacity-90';
  }
  if (prefix === 'hover:text') {
    return 'hover:text-z-active-text';
  }
  if (prefix === 'hover:border') {
    if (shadeNum <= 400) return 'hover:border-z-active-border';
    return 'hover:border-z-accent';
  }
  if (prefix === 'focus:border' || prefix === 'focus:ring' || prefix === 'focus-visible:ring' || prefix === 'ring') {
    if (opacity || shadeNum <= 400) return prefix.replace('border', 'border-z-active-border').replace('ring', 'ring-z-active-border');
    return prefix.replace('border', 'border-z-accent').replace('ring', 'ring-z-active-border');
  }
  if (prefix === 'from') return 'from-z-accent';
  if (prefix === 'to') return 'to-transparent';
  if (prefix === 'accent') return 'accent-z-accent';
  
  return match;
}

const colorRegex = /(text|bg|border|ring|hover:bg|hover:text|hover:border|focus:border|focus:ring|focus-visible:ring|from|to|accent)-(violet|emerald|indigo|blue)-([0-9]{2,3})(\/[0-9]+)?/g;

function processDirectory(dir) {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let original = content;

      content = content.replace(colorRegex, replacer);

      // And shadows
      content = content.replace(/shadow-\[var\(--z-active-glow\)\/20\]/g, 'shadow-[var(--z-active-glow)]');
      content = content.replace(/shadow-[a-z]+-200/g, 'shadow-[var(--z-active-glow)]');
      content = content.replace(/shadow-[a-z]+-500/g, 'shadow-[var(--z-active-glow)]');

      if (content !== original) {
        fs.writeFileSync(fullPath, content, 'utf8');
      }
    }
  });
}

processDirectory(directoryPath);
console.log('Semantic accent purge 2 complete.');
