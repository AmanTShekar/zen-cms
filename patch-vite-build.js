const fs = require('fs');

const files = [
  'packages/admin/vite.config.ts',
  'templates/blog-demo/blog-demo/vite.config.ts',
  'templates/blog-demo/vite.config.ts',
  'templates/demo/vite.config.ts',
  'templates/storefront-glass/vite.config.ts'
];

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  let content = fs.readFileSync(file, 'utf8');
  
  if (!content.includes('build: {') && !content.includes('build:')) {
    content = content.replace(/optimizeDeps: {/, `build: {\n    target: 'esnext',\n  },\n  optimizeDeps: {`);
    fs.writeFileSync(file, content);
    console.log('Fixed:', file);
  } else if (content.includes('build: {') && !content.includes('target:')) {
    content = content.replace(/build:\s*{/, "build: {\n    target: 'esnext',");
    fs.writeFileSync(file, content);
    console.log('Updated existing build object:', file);
  } else {
    console.log('Already has build target:', file);
  }
}
