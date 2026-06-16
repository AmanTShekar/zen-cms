const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const logFile = 'C:/Users/Asus/.gemini/antigravity-ide/brain/9493ba59-58b6-47c0-ad26-6039ff11257c/.system_generated/tasks/task-151.log';
const repoRoot = 'C:/Users/Asus/Desktop/cms';

const content = fs.readFileSync(logFile, 'utf8');
const lines = content.split('\n');

// Parse the patch to get the NEW contents of all files
let currentFile = null;
let inHunk = false;
let fileLines = [];
const patchFiles = {};

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  if (line.startsWith('diff --git ')) {
    if (currentFile && !currentFile.includes('\u00ef\u00bf\u00ba')) {
      patchFiles[currentFile] = fileLines.join('\n');
    }
    const match = line.match(/b\/(.*?)$/);
    currentFile = match ? match[1] : null;
    fileLines = [];
    inHunk = false;
  } else if (line.startsWith('@@') && currentFile) {
    inHunk = true;
  } else if (inHunk && currentFile) {
    if (line.startsWith('+') && !line.startsWith('+++')) {
      fileLines.push(line.substring(1));
    } else if (!line.startsWith('-') && !line.startsWith('\\')) {
      fileLines.push(line.substring(1)); // context line
    }
  }
}
if (currentFile && !currentFile.includes('\u00ef\u00bf\u00ba')) {
  patchFiles[currentFile] = fileLines.join('\n');
}

let differCount = 0;
let exactMatchCount = 0;

for (const [file, patchContent] of Object.entries(patchFiles)) {
  const fullPath = path.join(repoRoot, file);
  if (!fs.existsSync(fullPath)) continue;
  
  const currentContent = fs.readFileSync(fullPath, 'utf8');
  
  // Clean up line endings and whitespace for comparison
  const cleanPatch = patchContent.replace(/\r\n/g, '\n').trim();
  const cleanCurrent = currentContent.replace(/\r\n/g, '\n').trim();
  
  if (cleanPatch !== cleanCurrent) {
    console.log(`⚠️ DIFFERENT: ${file}`);
    console.log(`   Patch size: ${cleanPatch.length}, Current size: ${cleanCurrent.length}`);
    differCount++;
  } else {
    exactMatchCount++;
  }
}

console.log(`\n=== SUMMARY ===`);
console.log(`Matches 4AM state exactly: ${exactMatchCount}`);
console.log(`Differs from 4AM state: ${differCount}`);
