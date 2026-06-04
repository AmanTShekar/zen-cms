#!/usr/bin/env node
/**
 * Zenith CMS - E2E Test Runner
 * Runs each test file individually to avoid server crash cascades when running
 * all tests together. Each test file gets its own fresh server invocation.
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const testDir = path.join(__dirname, '..', 'e2e', 'tests');
const testFiles = fs.readdirSync(testDir).filter(f => f.endsWith('.spec.ts'));

console.log(`\n🚀 Zenith CMS E2E Test Suite — Running ${testFiles.length} spec files\n`);

const results = [];
let totalPassed = 0;
let totalFailed = 0;

for (const file of testFiles) {
  const filePath = path.join('e2e', 'tests', file);
  console.log(`\n📋 Running: ${file}`);
  
  try {
    const output = execSync(`pnpm test:e2e "${filePath}"`, {
      cwd: path.join(__dirname, '..'),
      encoding: 'utf-8',
      stdio: 'inherit',
      timeout: 120000
    });
    results.push({ file, status: 'PASSED' });
    totalPassed++;
  } catch (err) {
    results.push({ file, status: 'FAILED' });
    totalFailed++;
    console.error(`\n❌ ${file} FAILED`);
  }
}

console.log('\n' + '='.repeat(60));
console.log(`E2E Test Suite Results: ${totalPassed} passed, ${totalFailed} failed`);
console.log('='.repeat(60));
for (const r of results) {
  const icon = r.status === 'PASSED' ? '✅' : '❌';
  console.log(`  ${icon} ${r.file}`);
}
console.log('='.repeat(60) + '\n');

process.exit(totalFailed > 0 ? 1 : 0);
