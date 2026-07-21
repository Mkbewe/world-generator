#!/usr/bin/env node

const { execSync } = require('child_process');

// Run commitlint and capture output
let output = '';
let exitCode = 0;

try {
  execSync(`pnpm exec commitlint --edit ${process.argv[2]} --color=false`, {
    stdio: 'pipe',
    encoding: 'utf-8',
  });
} catch (error) {
  output = error.stdout || '';
  exitCode = error.status || 1;
}

// If validation passed, exit successfully
if (exitCode === 0) {
  process.exit(0);
}

// If validation failed, show friendly error message
{
  // Parse errors
  const lines = output.split('\n');
  const inputLine = lines.find(l => l.includes('--- input ---'));
  const errorLines = lines.filter(l => l.includes('✖'));

  // Display errors without colors (for VS Code compatibility)
  console.log('');
  console.log('===============================================================');
  console.log('   ❌  COMMIT MESSAGE VALIDATION FAILED!');
  console.log('===============================================================');
  console.log('');

  if (inputLine) {
    const nextLineIdx = lines.indexOf(inputLine) + 1;
    if (nextLineIdx < lines.length) {
      console.log('Your message: "' + lines[nextLineIdx].trim() + '"');
      console.log('');
    }
  }

  if (errorLines.length > 0) {
    console.log('┌─────────────────────────────────────────────────────────────┐');
    console.log('│                   ⚠   PROBLEMS FOUND   ⚠                    │');
    console.log('└─────────────────────────────────────────────────────────────┘');
    console.log('');
    errorLines.forEach(line => {
      const cleaned = line
        .replace(/✖/g, '')
        .replace(/\[.*?\]/g, '')
        .trim();
      if (cleaned && !cleaned.includes('found')) {
        console.log('  ❌ ' + cleaned);
      }
    });
    console.log('');
  }

  console.log('───────────────────────────────────────────────────────────────');
  console.log('                   💡 CORRECT FORMAT');
  console.log('───────────────────────────────────────────────────────────────');
  console.log('');
  console.log('  <type>: <description>');
  console.log('         ↑ SPACE REQUIRED!');
  console.log('');
  console.log('EXAMPLES:');
  console.log('  ✅ feat: add new feature');
  console.log('  ✅ fix: resolve login bug');
  console.log('  ✅ ci: add husky and commit lint');
  console.log('');
  console.log('VALID TYPES:');
  console.log('  feat, fix, docs, style, refactor, test,');
  console.log('  chore, ci, build, perf, revert');
  console.log('');
  console.log('RULES:');
  console.log('  ⚠  Everything must be lowercase!');
  console.log('  ⚠  Space after colon is required!');
  console.log('');

  process.exit(1);
}
