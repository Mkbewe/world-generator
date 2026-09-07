#!/usr/bin/env node
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const releaseType = process.argv[2] ?? 'patch';

if (!['patch', 'minor', 'major'].includes(releaseType)) {
  console.error(`Unknown release type "${releaseType}". Use patch, minor or major.`);
  process.exit(1);
}

const { version } = JSON.parse(readFileSync('./package.json', 'utf8'));
const [major, minor, patch] = version.split('.').map(Number);

const nextVersion =
  releaseType === 'major'
    ? `${major + 1}.0.0`
    : releaseType === 'minor'
      ? `${major}.${minor + 1}.0`
      : `${major}.${minor}.${patch + 1}`;

const branchName = `release/v${nextVersion}`;

execSync(`git checkout -b ${branchName}`, { stdio: 'inherit' });
execSync(`npx standard-version --release-as ${releaseType} --skip.tag`, { stdio: 'inherit' });
