const fs = require('fs');

const files = [
  'templates/blog-demo/blog-demo/vite.config.ts',
  'templates/blog-demo/vite.config.ts',
  'templates/demo/vite.config.ts',
  'templates/storefront-glass/vite.config.ts'
];

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  let content = fs.readFileSync(file, 'utf8');
  
  if (!content.includes('optimizeDeps: {')) {
    // Inject right before the last closing brace
    content = content.replace(/}\)\s*$/, `  optimizeDeps: {
    esbuildOptions: {
      target: 'esnext'
    }
  }
})
`);
    fs.writeFileSync(file, content);
    console.log('Fixed:', file);
  } else {
    console.log('Already has optimizeDeps:', file);
  }
}
