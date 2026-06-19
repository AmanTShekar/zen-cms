const fs = require('fs');
const path = require('path');

const directoryPath = path.join(__dirname, 'packages', 'admin', 'src');

const replacements = [
  // Full z-card with shadow
  {
    regex: /dark \? 'bg-black\/65 backdrop-blur-md border-white\/\[0\.08\] shadow-\[0_4px_30px_rgba\(0,0,0,0\.1\)\]' : 'bg-white border-gray-200 shadow-sm'/g,
    replacement: "'z-card'"
  },
  {
    regex: /theme === 'dark' \? 'bg-black\/65 backdrop-blur-md border-white\/\[0\.08\] shadow-\[0_4px_30px_rgba\(0,0,0,0\.1\)\]' : 'bg-white border-gray-200 shadow-sm'/g,
    replacement: "'z-card'"
  },
  {
    regex: /theme === 'dark' \? 'bg-black\/65 backdrop-blur-md border-white\/\[0\.08\] shadow-\[0_4px_30px_rgba\(0,0,0,0\.1\)\] p-8' : 'bg-white p-8'/g,
    replacement: "'z-card p-8'"
  },
  {
    regex: /dark \? 'bg-black\/65 backdrop-blur-md border-white\/\[0\.08\]' : 'bg-white border-gray-200'/g,
    replacement: "'z-panel'"
  },
  {
    regex: /theme === 'dark' \? 'bg-black\/65 backdrop-blur-md border-white\/\[0\.08\]' : 'bg-white border-gray-200'/g,
    replacement: "'z-panel'"
  },
  {
    regex: /dark \? 'bg-black\/65 backdrop-blur-md border-white\/\[0\.08\]' : 'bg-white border-gray-200 shadow-sm'/g,
    replacement: "'z-panel shadow-sm'"
  },
  {
    regex: /theme === 'dark' \? 'bg-black\/40 backdrop-blur-md border-white\/\[0\.08\]' : 'bg-gray-50\/50 border-gray-200 shadow-sm'/g,
    replacement: "'z-panel shadow-sm'"
  },
  // Active/Interactive cards
  {
    regex: /dark \? 'bg-black\/65 backdrop-blur-md border-white\/\[0\.08\] hover:border-violet-500\/30' : 'bg-white border-gray-200 hover:border-gray-300'/g,
    replacement: "'z-card-interactive'"
  },
  {
    regex: /theme === 'dark' \? 'bg-black\/65 backdrop-blur-md border-white\/\[0\.08\] hover:border-violet-500\/50' : 'bg-gray-50 border-gray-200 hover:border-gray-500'/g,
    replacement: "'z-card-interactive'"
  },
  // Inputs
  {
    regex: /dark \? 'bg-black\/65 backdrop-blur-md border-white\/\[0\.08\] focus:border-violet-500\/40 text-white placeholder:text-gray-600' : 'bg-white border-gray-200 focus:border-violet-500 text-gray-900 placeholder:text-gray-400'/g,
    replacement: "'z-input'"
  },
  {
    regex: /dark \? 'bg-black\/65 backdrop-blur-md border-white\/\[0\.08\] focus:border-violet-500 text-white' : 'bg-white border-gray-200 focus:border-violet-500 text-black'/g,
    replacement: "'z-input'"
  },
  {
    regex: /dark \? 'bg-black\/65 backdrop-blur-md border-white\/\[0\.08\] focus:border-violet-500 text-white' : 'bg-white border-gray-200 focus:border-violet-500 text-gray-900'/g,
    replacement: "'z-input'"
  },
  {
    regex: /theme === 'dark' \? 'bg-black\/65 backdrop-blur-md border-white\/\[0\.08\] focus:border-violet-500' : 'bg-gray-50 border-gray-200 focus:border-violet-500'/g,
    replacement: "'z-input'"
  },
  {
    regex: /dark \? 'bg-black\/65 backdrop-blur-md border-white\/\[0\.08\] text-white placeholder:text-gray-600 focus:border-red-500\/40' : 'bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-red-500'/g,
    replacement: "'z-input'"
  },
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
        console.log('Updated:', fullPath);
      }
    }
  });
}

processDirectory(directoryPath);
console.log('Refactoring complete.');
