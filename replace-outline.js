const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

const targetStr = 'outline-none';
const replaceStr = 'outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-black';

let modifiedFiles = 0;

walkDir(path.join(__dirname, 'packages/admin/src'), function(filePath) {
  if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Check if it already has focus-visible to avoid double replacement
    if (content.includes(targetStr) && !content.includes('focus-visible:ring-2')) {
      // We want to replace 'outline-none' but be careful if it's 'focus:outline-none'
      // To be safe, we will replace the exact string 'outline-none' when it's part of className strings
      // We can use a simple replaceAll because we checked for 'focus-visible' absence
      let newContent = content.split(targetStr).join(replaceStr);
      
      fs.writeFileSync(filePath, newContent, 'utf8');
      modifiedFiles++;
      console.log(`Updated: ${filePath}`);
    }
  }
});

console.log(`\nSuccessfully updated ${modifiedFiles} files.`);
