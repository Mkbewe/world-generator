#!/usr/bin/env node

import { confirm, input, select } from '@inquirer/prompts';
import { execa } from 'execa';

const TYPES = [
  'feat',
  'fix',
  'docs',
  'style',
  'refactor',
  'test',
  'chore',
  'ci',
  'build',
  'perf',
  'revert',
];
const REPO = 'Mkbewe/world-generator';

async function git(args) {
  const { stdout } = await execa('git', args);
  return stdout;
}

async function issueTitle(number) {
  try {
    const raw = (
      await execa('gh', ['issue', 'view', String(number), '-R', REPO, '--json', 'title'])
    ).stdout;
    return JSON.parse(raw).title.trim().replace(/\.$/, '').toLowerCase();
  } catch {
    return undefined;
  }
}

function scopeFromPaths(paths) {
  const counts = new Map();
  for (const path of paths) {
    const parts = path.split('/');
    const rest = parts[0] === 'src' ? parts.slice(1) : parts;
    const scope = rest[0] === 'utils' || rest[0] === 'components' ? rest[1] : rest[0];
    if (!scope || scope.includes('.')) {
      continue;
    }
    counts.set(scope, (counts.get(scope) ?? 0) + 1);
  }

  let best = '';
  let bestCount = 0;
  for (const [scope, count] of counts) {
    if (count > bestCount) {
      best = scope;
      bestCount = count;
    }
  }
  return best;
}

async function copyToClipboard(text) {
  if (process.platform !== 'win32') {
    return false;
  }
  try {
    await execa('clip', { input: text });
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const staged = (await git(['diff', '--cached', '--name-only']))
    .trim()
    .split('\n')
    .filter(Boolean);
  if (staged.length === 0) {
    console.error('Brak zmian w stage. Najpierw: git add <pliki>');
    process.exit(1);
  }
  if (!process.stdin.isTTY) {
    console.error('Ten skrypt wymaga interaktywnego terminala.');
    process.exit(1);
  }

  const branch = (await git(['branch', '--show-current'])).trim();
  const match = /^([a-z]+)\/(\d+)-/.exec(branch);
  const defaultType = match && TYPES.includes(match[1]) ? match[1] : 'feat';

  const acceptSuggested = await confirm({
    message: `Typ commita: ${defaultType}${match ? ' (z brancha)' : ''}. Zgoda?`,
    default: true,
  });
  const type = acceptSuggested
    ? defaultType
    : await select({
        message: 'Wybierz typ commita',
        choices: TYPES.map(value => ({ name: value, value })),
        default: defaultType,
      });

  const defaultScope = match?.[2] ?? scopeFromPaths(staged);
  const scopeInput = (
    await input({
      message: `Scope (Enter = ${defaultScope || 'brak'}, "-" = brak)`,
      default: defaultScope,
    })
  ).trim();
  const scope = scopeInput === '-' ? '' : scopeInput;

  const issueNumber = match?.[2];
  const defaultSubject = issueNumber ? await issueTitle(issueNumber) : undefined;
  const subject = (
    await input({
      message: defaultSubject
        ? `Subject (z issue #${issueNumber}, lowercase)`
        : 'Subject (lowercase, bez kropki)',
      default: defaultSubject,
      validate: value => value.trim().length > 0 || 'Subject jest wymagany.',
    })
  ).trim();

  const header = scope ? `${type}(${scope}): ${subject}` : `${type}: ${subject}`;
  const copied = await copyToClipboard(header);

  console.log(`\n${header}`);
  console.log(
    copied
      ? '\nSkopiowano do schowka — wklej w VS Code (Ctrl+V) i zatwierdź commit sam.'
      : '\nSkopiuj powyższą linię.'
  );
}

try {
  await main();
} catch (error) {
  if (error?.name === 'ExitPromptError') {
    console.log('\nAnulowano.');
    process.exit(0);
  }
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
