#!/usr/bin/env node
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const RELEASE_TYPES = ['patch', 'minor', 'major'];

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const requestedType = args.find(argument => !argument.startsWith('--'));

if (requestedType && !RELEASE_TYPES.includes(requestedType)) {
  console.error(`Unknown release type "${requestedType}". Use patch, minor or major.`);
  process.exit(1);
}

const { version } = JSON.parse(readFileSync('./package.json', 'utf8'));
const releaseType = requestedType ?? detectReleaseType(version);
const [major, minor, patch] = version.split('.').map(Number);

const nextVersion =
  releaseType === 'major'
    ? `${major + 1}.0.0`
    : releaseType === 'minor'
      ? `${major}.${minor + 1}.0`
      : `${major}.${minor}.${patch + 1}`;

const branchName = `release/v${nextVersion}`;

console.log(
  `${requestedType ? 'Requested' : 'Detected'} release type: ${releaseType} (${version} -> ${nextVersion})`
);

if (dryRun) {
  console.log(
    `Dry run: would create ${branchName} and run standard-version --release-as ${releaseType}.`
  );
  process.exit(0);
}

execSync(`git checkout -b ${branchName}`, { stdio: 'inherit' });
execSync(`npx standard-version --release-as ${releaseType} --skip.tag`, { stdio: 'inherit' });

/** Detects the bump from conventional commits since the last tag. */
function detectReleaseType(currentVersion) {
  const lastTag = execSync('git describe --tags --abbrev=0', { encoding: 'utf8' }).trim();
  const commits = execSync(`git log --format=%B ${lastTag}..HEAD`, { encoding: 'utf8' }).trim();

  if (!commits) {
    console.error(`No commits since ${lastTag}. Nothing to release.`);
    process.exit(1);
  }

  const breaking = /^BREAKING[ -]CHANGE:/m.test(commits) || /^[a-z]+(\([^)]*\))?!:/m.test(commits);
  if (breaking) {
    // Before 1.0.0 a breaking change bumps the minor, matching conventional-recommended-bump.
    return currentVersion.startsWith('0.') ? 'minor' : 'major';
  }

  return /^feat(\([^)]*\))?:/m.test(commits) ? 'minor' : 'patch';
}
