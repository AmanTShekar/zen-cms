#!/usr/bin/env node

const { program } = require('commander')
const chalk = require('chalk')
const fs = require('fs-extra')
const path = require('path')
const { execSync } = require('child_process')
const inquirer = require('inquirer')

program
  .version('1.0.0')
  .argument('[project-directory]', 'Directory to initialize the Zenith CMS project')
  .option('-p, --pnpm', 'Use pnpm automatically without prompting')
  .action(async (projectDir, options) => {
    console.log(chalk.blue.bold('\nWelcome to Zenith CMS\n'))

    if (!projectDir) {
      const answers = await inquirer.prompt([
        {
          type: 'input',
          name: 'projectDir',
          message: 'What is your project named?',
          default: 'my-zenith-app',
        },
      ])
      projectDir = answers.projectDir
    }

    const targetPath = path.resolve(process.cwd(), projectDir)

    if (fs.existsSync(targetPath) && fs.readdirSync(targetPath).length > 0) {
      console.log(chalk.red(`\nError: Directory ${projectDir} is not empty.\n`))
      process.exit(1)
    }

    console.log(`\nInitializing Zenith CMS project in ${chalk.green(targetPath)}...\n`)
    fs.ensureDirSync(targetPath)

    // 1. Create package.json
    const packageJson = {
      name: projectDir,
      version: "0.1.0",
      private: true,
      scripts: {
        "dev": "zenith dev",
        "build": "zenith build",
        "start": "zenith start"
      },
      dependencies: {
        "@zenith-open/zenithcms-core": "latest",
        "@zenith-open/zenithcms-admin": "latest",
        "@zenith-open/zenithcms-types": "latest",
        "typescript": "^5.0.0"
      }
    }
    fs.writeJsonSync(path.join(targetPath, 'package.json'), packageJson, { spaces: 2 })

    // 2. Create cms.config.ts
    const configContent = `import { buildConfig } from '@zenith-open/zenithcms-core';

export default buildConfig({
  admin: {
    useAsTitle: 'name'
  },
  collections: [
    {
      slug: 'posts',
      name: 'Posts',
      fields: [
        { name: 'title', type: 'text', required: true },
        { name: 'content', type: 'richtext' }
      ]
    }
  ]
});
`
    fs.writeFileSync(path.join(targetPath, 'cms.config.ts'), configContent)

    // 3. Create .env
    const envContent = `DATABASE_URL=postgresql://zenith:zenith_password@localhost:5432/zenith
REDIS_URL=redis://localhost:6379
JWT_SECRET=super_secret_dev_key
NODE_ENV=development
PORT=3000
`
    fs.writeFileSync(path.join(targetPath, '.env'), envContent)

    console.log(chalk.blue('Files generated. Installing dependencies...\n'))

    const usePnpm = options.pnpm ? true : false;
    let pm = usePnpm ? 'pnpm' : 'npm'

    if (!options.pnpm) {
        const pmAns = await inquirer.prompt([
            {
                type: 'list',
                name: 'pm',
                message: 'Which package manager do you want to use?',
                choices: ['pnpm', 'npm', 'yarn'],
                default: 'pnpm'
            }
        ])
        pm = pmAns.pm
    }

    try {
      execSync(`${pm} install`, { cwd: targetPath, stdio: 'inherit' })
      console.log(chalk.green.bold('\nProject successfully initialized!'))
      console.log(`\nNext steps:`)
      console.log(`  cd ${projectDir}`)
      console.log(`  ${pm} run dev\n`)
    } catch (err) {
      console.log(chalk.red('\nFailed to install dependencies. You can run it manually.'))
    }
  })

program.parse(process.argv)
