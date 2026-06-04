#!/usr/bin/env node
import { Command } from 'commander'
import chalk from 'chalk'
import path from 'path'
import fs from 'fs'
import { execSync } from 'child_process'
import readline from 'readline'

const program = new Command()

/**
 * create-zenithcms-app CLI
 * ───────────────────────
 * The official command-line bootstrapper to set up a fresh Zenith CMS project in seconds.
 */

const question = (query: string): Promise<string> => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })
  return new Promise((resolve) =>
    rl.question(query, (ans) => {
      rl.close()
      resolve(ans.trim())
    })
  )
}

program
  .name('create-zenithcms-app')
  .description('Bootstrap a new Zenith CMS project')
  .argument('[directory]', 'Target project directory name')
  .option('-d, --database <type>', 'Database choice: mongodb or postgres')
  .option('-y, --yes', 'Skip prompts and bootstrap with default options')
  .option('--install', 'Automatically install package dependencies')
  .action(async (directoryArg, options) => {
    console.log('\n' + chalk.bold.hex('#8B5CF6')('⚡ Zenith CMS — Project Bootstrap Station') + '\n')

    // 1. Gather project directory
    let targetDir = directoryArg
    if (!targetDir) {
      if (options.yes) {
        targetDir = 'my-zenith-cms'
      } else {
        targetDir = await question(chalk.white('? ') + chalk.bold('Project directory name: ') + chalk.gray('(my-zenith-cms) '))
        if (!targetDir) targetDir = 'my-zenith-cms'
      }
    }

    const projectPath = path.resolve(process.cwd(), targetDir)

    if (fs.existsSync(projectPath)) {
      console.error(chalk.red(`\n❌ Error: Directory "${targetDir}" already exists. Please choose another name.\n`))
      process.exit(1)
    }

    // 2. Gather database adapter preference
    let isPostgres = false
    if (options.database) {
      const dbTypeLower = options.database.toLowerCase()
      if (dbTypeLower === 'postgres' || dbTypeLower === 'postgresql' || dbTypeLower === 'pg') {
        isPostgres = true
      }
    } else if (!options.yes) {
      console.log('\n' + chalk.bold.white('Select your database adapter:'))
      console.log(chalk.gray('  1) MongoDB  — Flexible, document-oriented (Default)'))
      console.log(chalk.gray('  2) Postgres — High-performance, relational'))
      
      const dbChoice = await question(chalk.white('\n? ') + chalk.bold('Database choice (1 or 2): ') + chalk.gray('(1) '))
      isPostgres = dbChoice === '2'
    }

    const dbType = isPostgres ? 'PostgreSQL' : 'MongoDB'
    const dbPkg = isPostgres ? '@zenithcms/db-postgres' : '@zenithcms/db-mongodb'

    console.log('\n' + chalk.cyan('🏗️  Configuring project scaffolding...'))

    // 3. Create target directories
    fs.mkdirSync(projectPath, { recursive: true })
    fs.mkdirSync(path.join(projectPath, 'src'), { recursive: true })

    // 4. Generate package.json
    const packageJson = {
      name: path.basename(projectPath),
      version: '0.1.0',
      private: true,
      type: 'module',
      scripts: {
        "dev": "tsx server.ts",
        "build": "tsc",
        "start": "node dist/server.js"
      },
      dependencies: {
        "@zenithcms/core": "^0.2.0",
        "@zenithcms/types": "^0.2.0",
        [dbPkg]: "^0.2.0",
        "tsx": "^4.19.0",
        "typescript": "^5.4.5"
      }
    }
    fs.writeFileSync(
      path.join(projectPath, 'package.json'),
      JSON.stringify(packageJson, null, 2)
    )

    // 5. Generate zenith.config.ts
    const configContent = `import type { CMSConfig } from '@zenithcms/types'

const config: CMSConfig = {
  collections: [
    {
      name: 'Post',
      slug: 'posts',
      fields: [
        { name: 'title', type: 'text', required: true },
        { name: 'slug', type: 'text', required: true, unique: true },
        { name: 'description', type: 'text' },
        { name: 'content', type: 'richtext' }
      ]
    },
    {
      name: 'Category',
      slug: 'categories',
      fields: [
        { name: 'name', type: 'text', required: true },
        { name: 'slug', type: 'text', required: true, unique: true }
      ]
    },
    {
      name: 'Page',
      slug: 'pages',
      fields: [
        { name: 'title', type: 'text', required: true },
        { name: 'slug', type: 'text', required: true, unique: true },
        { name: 'sections', type: 'blocks' }
      ]
    }
  ]
}

export default config
`
    fs.writeFileSync(path.join(projectPath, 'zenith.config.ts'), configContent)

    // 6. Generate server.ts
    const serverContent = `import { Zenith } from '@zenithcms/core'
import config from './zenith.config.js'

// Initialize the visual-first pro-code engine
const app = new Zenith({
  config,
  port: Number(process.env.PORT) || 3000
})

// Fire up the nucleus
await app.start()
`
    fs.writeFileSync(path.join(projectPath, 'server.ts'), serverContent)

    // 7. Generate .env template
    const dbConnStr = isPostgres
      ? 'postgres://postgres:postgres@localhost:5432/zenith'
      : 'mongodb://localhost:27017/zenith'

    const envContent = `# System Settings
PORT=3000
JWT_SECRET=zenith_nucleus_secret_key_${Math.random().toString(36).substring(2, 15)}
COOKIE_SECRET=zenith_cookie_secure_salt_${Math.random().toString(36).substring(2, 15)}

# Database Connection (${dbType})
DATABASE_URL=${dbConnStr}
DATABASE_TYPE=${isPostgres ? 'postgres' : 'mongodb'}

# Redis Coordination (Optional cluster scheduler / pub-sub)
# REDIS_URL=redis://localhost:6379
`
    fs.writeFileSync(path.join(projectPath, '.env'), envContent)

    // 8. Generate basic tsconfig.json
    const tsconfigContent = `{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true,
    "outDir": "./dist"
  },
  "include": ["**/*.ts"]
}
`
    fs.writeFileSync(path.join(projectPath, 'tsconfig.json'), tsconfigContent)

    // 9. Generate .gitignore
    const gitignoreContent = `node_modules
dist
temp
.env
*.log
`
    fs.writeFileSync(path.join(projectPath, '.gitignore'), gitignoreContent)

    // 10. Generate README.md
    const readmeContent = `# ⚡ ${path.basename(projectPath)} — Built with Zenith CMS

A modern, fast, security-hardened headless CMS.

## 🚀 Getting Started

### 1. Install Dependencies
\`\`\`bash
npm install
# or
pnpm install
\`\`\`

### 2. Set Up Environment
Configure connection strings inside the generated \`.env\` file.

### 3. Run Development Server
\`\`\`bash
npm run dev
\`\`\`

The Admin dashboard is running at \`http://localhost:3000/admin\`.
`
    fs.writeFileSync(path.join(projectPath, 'README.md'), readmeContent)

    console.log(chalk.green(`✓ Scaffolding complete! Created Zenith project inside "${targetDir}"`))

    // 11. Run Auto Installation if requested
    let shouldInstall = options.install || false
    if (!shouldInstall && !options.yes) {
      const installChoice = await question(chalk.white('\n? ') + chalk.bold('Do you want to install dependencies automatically? (y/N): '))
      shouldInstall = installChoice.toLowerCase() === 'y'
    }

    if (shouldInstall) {
      console.log('\n' + chalk.cyan('📦 Installing dependencies... This may take a minute.'))
      try {
        let pm = 'npm'
        // Detect package manager being used currently
        if (fs.existsSync(path.resolve(process.cwd(), '../../pnpm-lock.yaml')) || fs.existsSync(path.resolve(process.cwd(), 'pnpm-workspace.yaml'))) {
          pm = 'pnpm'
        }
        execSync(`${pm} install`, { stdio: 'inherit', cwd: projectPath })
        console.log(chalk.green(`✓ Dependencies installed successfully using ${pm}!`))
      } catch (err) {
        console.error(chalk.yellow(`⚠ Warning: Dependency installation failed. You may need to run installer manually.`))
      }
    }

    console.log('\n' + chalk.bold.hex('#10B981')('🚀 Zenith CMS successfully bootstrapped!') + '\n')
    console.log(chalk.white('To get started:'))
    console.log(chalk.gray(`  cd ${targetDir}`))
    if (!shouldInstall) {
      console.log(chalk.gray('  pnpm install  ') + chalk.dim('(or npm install)'))
    }
    console.log(chalk.gray('  pnpm dev      ') + chalk.dim('(to run development server)'))
    console.log('\n' + chalk.bold.hex('#8B5CF6')('Zenith is ready to build the modern web.') + '\n')
  })

program.parse()
