const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'packages/core/src/services/content.ts');
let content = fs.readFileSync(file, 'utf8');

const target = `      // Apply RLS (Row Level Security) for deletes
      // access.delete() may return a boolean OR an object of query constraints
      // so users can only delete their own documents (e.g. { createdBy: user.id }).
      if (options.user && typeof this.config.access?.delete === 'function') {
        const access = this.config.access.delete(options.user, { req: (options as any).req })
        if (access === false) throw new ForbiddenError()
        if (typeof access === 'object' && access !== null) {
          Object.assign(query, access)
        }
      }`;

const replacement = `      // Apply RLS (Row Level Security) for deletes
      RLSService.applyDeleteAccess(this.config.access, options.user, (options as any).req)`;

content = content.replace(target, replacement);

fs.writeFileSync(file, content);
console.log('content.ts delete RLS refactored successfully');
