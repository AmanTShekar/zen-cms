const fs = require('fs');
const path = require('path');

// The patch contains the DIFF vs git HEAD. The e2e files show mostly + lines
// because the patch was generated with git diff HEAD (uncommitted changes)
// So lines starting with + ARE the 4AM content, lines starting with - are what was in git HEAD
// Let's extract the FULL content of e2e files from the patch

const logFile = 'C:/Users/Asus/.gemini/antigravity-ide/brain/9493ba59-58b6-47c0-ad26-6039ff11257c/.system_generated/tasks/task-4567.log';
const content = fs.readFileSync(logFile, 'utf8');
const lines = content.split('\n');

let currentFile = null;
let inHunk = false;
let fileLines = [];
const e2eFiles = {};

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  if (line.startsWith('diff --git ')) {
    // Save previous file if it was e2e
    if (currentFile && currentFile.startsWith('e2e/tests/')) {
      e2eFiles[currentFile] = fileLines.join('\n');
    }
    
    const match = line.match(/b\/(e2e\/tests\/[^\s]+)/);
    currentFile = match ? match[1] : null;
    fileLines = [];
    inHunk = false;
  } else if (line.startsWith('@@') && currentFile && currentFile.startsWith('e2e/tests/')) {
    inHunk = true;
  } else if (inHunk && currentFile && currentFile.startsWith('e2e/tests/')) {
    if (line.startsWith('+') && !line.startsWith('+++')) {
      fileLines.push(line.substring(1));
    } else if (!line.startsWith('-') && !line.startsWith('\\')) {
      fileLines.push(line.substring(1)); // context line
    }
  }
}

// Save last file
if (currentFile && currentFile.startsWith('e2e/tests/')) {
  e2eFiles[currentFile] = fileLines.join('\n');
}

console.log('E2E files found in patch:', Object.keys(e2eFiles).length);
let totalTests = 0;
for (const [file, content] of Object.entries(e2eFiles)) {
  const testCount = (content.match(/\btest\s*\(/g) || []).length;
  const size = content.length;
  console.log(`  ${path.basename(file)}: ${testCount} tests, ${size} bytes, ${content.split('\n').length} lines`);
  totalTests += testCount;
  
  // Write to file if significantly different from current
  const currentPath = path.join('C:/Users/Asus/Desktop/cms', file);
  const currentContent = fs.existsSync(currentPath) ? fs.readFileSync(currentPath, 'utf8') : '';
  if (content.length > currentContent.length + 100) {
    console.log(`    ⚠️  PATCH VERSION IS LARGER - ${content.length} vs current ${currentContent.length}`);
  }
}
console.log(`\nTotal tests in PATCH e2e files: ${totalTests}`);
