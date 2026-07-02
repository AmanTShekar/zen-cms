/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'core-no-react',
      comment: 'packages/core is strictly server-side. Do not import React components or hooks.',
      severity: 'error',
      from: { path: '^packages/core/src' },
      to: {
        path: '(^react$|^react-dom$|^packages/admin/)',
      },
    },
    {
      name: 'core-no-css',
      comment: 'packages/core must not import CSS files.',
      severity: 'error',
      from: { path: '^packages/core/src' },
      to: {
        path: '\\.css$',
      },
    },
    {
      name: 'admin-no-db',
      comment: 'packages/admin must only access database structures via HTTP API, never directly via drivers.',
      severity: 'error',
      from: { path: '^packages/admin/src' },
      to: {
        path: '(^mongoose$|^drizzle-orm$|^packages/core/src/database|^packages/db-mongodb|^packages/db-postgres)',
      },
    },
    {
      name: 'admin-no-core-backend',
      comment: 'packages/admin cannot import backend execution logic from packages/core.',
      severity: 'error',
      from: { path: '^packages/admin/src' },
      to: {
        path: '^packages/core/src/(services|middleware|database)/',
      },
    },
  ],
  options: {
    doNotFollow: {
      path: 'node_modules',
    },
    tsPreCompilationDeps: true,
    tsConfig: {
      fileName: 'tsconfig.json',
    },
  },
};
