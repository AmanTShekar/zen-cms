const fs = require('fs');
const path = require('path');

const directoryPath = path.join(__dirname, 'packages', 'admin', 'src');

const replacements = [
  // Common Dark/Light Ternaries
  {
    regex: /theme === 'dark' \? 'bg-black\/65 border-white\/\[0\.08\] text-white' : 'bg-white border-gray-200 shadow-sm text-gray-900'/g,
    replacement: "'bg-z-panel border-z-border text-z-primary shadow-sm'"
  },
  {
    regex: /theme === 'dark' \? 'bg-black\/65 backdrop-blur-md border-white\/\[0\.08\] text-white' : 'bg-white border-gray-200 shadow-sm text-gray-900'/g,
    replacement: "'bg-z-panel border-z-border text-z-primary shadow-sm backdrop-blur-md'"
  },
  {
    regex: /theme === 'dark' \? 'bg-white\/\[0\.02\] border-white\/\[0\.08\]' : 'bg-white border-gray-200 shadow-sm'/g,
    replacement: "'bg-z-panel border-z-border shadow-sm'"
  },
  {
    regex: /theme === 'dark' \? 'border-white\/\[0\.08\] text-gray-500' : 'border-gray-200 text-gray-400'/g,
    replacement: "'border-z-border text-z-secondary'"
  },
  {
    regex: /theme === 'dark' \? 'border-white\/\[0\.04\]' : 'border-gray-100'/g,
    replacement: "'border-z-border'"
  },
  {
    regex: /theme === 'dark' \? 'bg-white\/\[0\.02\] border-white\/\[0\.08\]' : 'bg-gray-50\/50 border-gray-200'/g,
    replacement: "'bg-z-panel border-z-border'"
  },
  {
    regex: /theme === 'dark' \? 'bg-black\/90 border-white\/\[0\.08\]' : 'bg-white border-gray-200 shadow-sm'/g,
    replacement: "'bg-z-popover border-z-border shadow-sm'"
  },
  {
    regex: /theme === 'dark' \? 'border-white\/\[0\.08\]' : 'border-gray-50'/g,
    replacement: "'border-z-border'"
  },
  {
    regex: /theme === 'dark' \? 'bg-white\/5 hover:bg-white\/10 text-white border border-white\/\[0\.08\]' : 'bg-white hover:bg-gray-50 border border-gray-200 text-gray-900'/g,
    replacement: "'bg-z-panel hover:bg-z-hover text-z-primary border-z-border'"
  },
  {
    regex: /theme === 'dark' \? 'bg-black border-white\/\[0\.08\] text-white' : 'bg-white border-gray-200 shadow-sm text-gray-900'/g,
    replacement: "'bg-z-panel border-z-border text-z-primary shadow-sm'"
  },
  {
    regex: /dark \? 'border-white\/\[0\.08\] bg-black' : 'border-gray-200 bg-white'/g,
    replacement: "'border-z-border bg-z-panel'"
  },
  {
    regex: /dark \? 'bg-black border-white\/\[0\.08\] focus:border-gray-500' : 'bg-gray-50 border-gray-200 focus:border-gray-500'/g,
    replacement: "'bg-z-input border-z-border focus:border-gray-500'"
  },
  {
    regex: /dark \? 'bg-black border-white\/\[0\.08\] focus:border-gray-500 text-white' : 'bg-gray-50 border-gray-200 focus:border-gray-500 text-black'/g,
    replacement: "'bg-z-input border-z-border focus:border-gray-500 text-z-primary'"
  },

  // Simpler structural replacements for standard components
  { regex: /bg-black\/65/g, replacement: 'bg-z-panel' },
  { regex: /bg-black\/90/g, replacement: 'bg-z-popover' },
  { regex: /border-white\/\[0\.08\]/g, replacement: 'border-z-border' },
  { regex: /border-white\/\[0\.04\]/g, replacement: 'border-z-border' },
  { regex: /border-white\/\[0\.06\]/g, replacement: 'border-z-border' },
  { regex: /border-white\/\[0\.1\]/g, replacement: 'border-z-border-strong' },
  { regex: /border-white\/\[0\.15\]/g, replacement: 'border-z-border-strong' },
  { regex: /bg-white\/\[0\.02\]/g, replacement: 'bg-z-panel' },
  { regex: /bg-white\/\[0\.03\]/g, replacement: 'bg-z-hover' },
  { regex: /bg-white\/\[0\.04\]/g, replacement: 'bg-z-hover' },
  { regex: /bg-white\/5/g, replacement: 'bg-z-hover' },
  
  // Light mode equivalents inside classNames
  { regex: /bg-white border-gray-200/g, replacement: 'bg-z-panel border-z-border' },
  { regex: /bg-gray-50 border-gray-200/g, replacement: 'bg-z-input border-z-border' },
  { regex: /text-gray-900/g, replacement: 'text-z-primary' },
  { regex: /text-gray-500/g, replacement: 'text-z-secondary' },
  { regex: /text-gray-400/g, replacement: 'text-z-muted' },
  { regex: /border-gray-200/g, replacement: 'border-z-border' },
  { regex: /border-gray-100/g, replacement: 'border-z-border' },
  { regex: /border-gray-300/g, replacement: 'border-z-border-strong' },
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
        // console.log('Updated:', fullPath);
      }
    }
  });
}

processDirectory(directoryPath);
console.log('Semantic purge complete.');
