const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'packages/core/src/services/content.ts');
let content = fs.readFileSync(file, 'utf8');

// 1. Add imports
content = content.replace("import { hookRegistry } from '../plugins/hooks'", 
  "import { hookRegistry } from '../plugins/hooks'\nimport { VersioningService } from './versioning'\nimport { RLSService } from './rls'");

// 2. Replace _createVersion and _enforceMaxVersions
const versioningStart = "private async _createVersion(doc: any, options: any, delta?: any) {";
const versionEndMatch = "logger.warn({ err, collection: this.config.slug, documentId }, 'Version pruning failed')\n    }\n  }\n}";

const blockToRemove = content.substring(content.indexOf(versioningStart), content.indexOf(versionEndMatch) + versionEndMatch.length - 2);

content = content.replace(blockToRemove, "");

// 3. Replace RLS in find
content = content.replace(
`    // Apply RLS (Row Level Security)
    if (options.user && typeof this.config.access?.read === 'function') {
      const access = this.config.access.read(options.user)
      if (access === false) return []
      if (typeof access === 'object') query = { ...query, ...access }
    }`,
`    // Apply RLS (Row Level Security)
    if (!RLSService.applyReadAccess(query, this.config.access, options.user)) return []`
);

// 4. Replace RLS in findById
content = content.replace(
`    // Apply RLS (Row Level Security)
    if (options.user && typeof this.config.access?.read === 'function') {
      const access = this.config.access.read(options.user)
      if (access === false) return null
      if (typeof access === 'object') {
        Object.assign(query, access)
      }
    }`,
`    // Apply RLS (Row Level Security)
    if (!RLSService.applyReadAccess(query, this.config.access, options.user)) return null`
);

// 5. Replace RLS in update
content = content.replace(
`      // Apply RLS (Row Level Security) for updates
      // access.update() may return a boolean (allow/deny) OR an object (query constraints)
      // that restricts which documents the user may write to — same pattern as read RLS.
      if (options.user && typeof this.config.access?.update === 'function') {
        const access = this.config.access.update(options.user, { req: (options as any).req })
        if (access === false) throw new ForbiddenError()
        if (typeof access === 'object' && access !== null) {
          Object.assign(query, access)
        }
      }`,
`      // Apply RLS (Row Level Security) for updates
      RLSService.applyUpdateAccess(query, this.config.access, options.user, (options as any).req)`
);

// 6. Replace `await this._createVersion` with `await new VersioningService(this.adapter, this.config).createVersion`
content = content.replace(/await this\._createVersion/g, "await new VersioningService(this.adapter, this.config).createVersion");

fs.writeFileSync(file, content);
console.log('content.ts refactored successfully');
