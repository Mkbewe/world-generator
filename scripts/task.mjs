#!/usr/bin/env node

import { confirm, select } from '@inquirer/prompts';
import { execa } from 'execa';

const OWNER = 'Mkbewe';
const PROJECT = '1';
const REPO = 'Mkbewe/world-generator';
const STATUSES = ['ToDo', 'In progress'];
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

/** Priority order: first matching label wins. */
const LABEL_TYPES = [
  ['bug', 'fix'],
  ['enhancement', 'feat'],
  ['documentation', 'docs'],
  ['refactor', 'refactor'],
  ['test', 'test'],
  ['ci', 'ci'],
  ['chore', 'chore'],
  ['perf', 'perf'],
];
const TYPE_LABEL = new Map(LABEL_TYPES.map(([label, type]) => [type, label]));

async function gh(args, options = {}) {
  const { stdout } = await execa('gh', args, options);
  return stdout;
}

function slug(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50)
    .replace(/-+$/, '');
}

function suggestType(title) {
  const lower = title.toLowerCase();
  if (/\b(fix|bug|crash|flicker|error)\b/.test(lower)) {
    return 'fix';
  }
  if (/\b(refactor|cleanup|clean up|simplify)\b/.test(lower)) {
    return 'refactor';
  }
  if (/\btest/.test(lower)) {
    return 'test';
  }
  if (/\b(doc|docs|readme)\b/.test(lower)) {
    return 'docs';
  }
  return 'feat';
}

function typeFromLabels(labels) {
  return LABEL_TYPES.find(([label]) => labels.includes(label))?.[1];
}

async function main() {
  if (!process.stdin.isTTY) {
    console.error('Ten skrypt wymaga interaktywnego terminala.');
    process.exit(1);
  }

  const raw = await gh([
    'project',
    'item-list',
    PROJECT,
    '--owner',
    OWNER,
    '--limit',
    '100',
    '--format',
    'json',
  ]);
  const items = JSON.parse(raw)
    .items.filter(item => item.content?.type === 'Issue' && STATUSES.includes(item.status))
    .sort((a, b) => a.content.number - b.content.number);

  if (items.length === 0) {
    console.log(`Brak tasków w statusach: ${STATUSES.join(', ')}.`);
    return;
  }

  const item = await select({
    message: 'Wybierz task z tablicy (↑/↓, Enter)',
    choices: items.map(entry => ({
      name: `[${entry.status}] #${entry.content.number}  ${entry.content.title}`,
      value: entry,
    })),
    pageSize: 15,
  });

  const issue = JSON.parse(
    await gh(['issue', 'view', String(item.content.number), '-R', REPO, '--json', 'labels'])
  );
  const labels = issue.labels.map(label => label.name);
  const fromLabel = typeFromLabels(labels);
  const suggested = fromLabel ?? suggestType(item.content.title);
  const source = fromLabel ? 'label' : 'tytuł';

  const acceptSuggested = await confirm({
    message: `Typ commita: ${suggested}. Zgoda?`,
    default: true,
  });
  const type = acceptSuggested
    ? suggested
    : await select({
        message: 'Wybierz typ commita',
        choices: TYPES.map(value => ({ name: value, value })),
        default: suggested,
      });

  const label = TYPE_LABEL.get(type);
  if (label && !labels.includes(label)) {
    const addLabel = await confirm({
      message: `Dodać label "${label}" do issue #${item.content.number}?`,
      default: true,
    });
    if (addLabel) {
      await gh(['issue', 'edit', String(item.content.number), '-R', REPO, '--add-label', label]);
      console.log(`Dodano label "${label}".`);
    }
  }

  const branch = `${type}/${item.content.number}-${slug(item.content.title)}`;
  const proceed = await confirm({
    message: `Utworzyć branch "${branch}" dla issue #${item.content.number}?`,
    default: true,
  });
  if (!proceed) {
    return;
  }

  await gh(
    ['issue', 'develop', String(item.content.number), '-R', REPO, '--name', branch, '--checkout'],
    { stdio: 'inherit' }
  );
  console.log(`\nGotowe. Pracujesz na "${branch}" (issue #${item.content.number}).`);
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
