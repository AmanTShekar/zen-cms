const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      results.push(file);
    }
  });
  return results;
}

const files = walk('packages/admin/src');
let updatedCount = 0;

files.forEach(file => {
  let original = fs.readFileSync(file, 'utf8');
  let content = original;

  content = content.replace(/"grid grid-cols-4\b/g, '"grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4');
  content = content.replace(/"grid grid-cols-3\b/g, '"grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3');
  content = content.replace(/"grid grid-cols-2\b/g, '"grid grid-cols-1 md:grid-cols-2');
  
  content = content.replace(/'grid grid-cols-4\b/g, "'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4");
  content = content.replace(/'grid grid-cols-3\b/g, "'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3");
  content = content.replace(/'grid grid-cols-2\b/g, "'grid grid-cols-1 md:grid-cols-2");

  content = content.replace(/`grid grid-cols-4\b/g, "`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4");
  content = content.replace(/`grid grid-cols-3\b/g, "`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3");
  content = content.replace(/`grid grid-cols-2\b/g, "`grid grid-cols-1 md:grid-cols-2");

  if (content.includes('<table')) {
    if (!content.includes('overflow-x-auto min-w-full pb-4')) {
      content = content.replace(/(<table[^>]*>)/g, '<div className="overflow-x-auto min-w-full pb-4">$1');
      content = content.replace(/(<\/table>)/g, '$1</div>');
    }
  }

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    updatedCount++;
  }
});

console.log('Successfully applied responsive grid & table updates to ' + updatedCount + ' files.');
