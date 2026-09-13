import createPreset from 'conventional-changelog-conventionalcommits';

const types = [
  { type: 'feat', section: 'Features' },
  { type: 'fix', section: 'Bug Fixes' },
  { type: 'chore', section: 'Chores' },
  { type: 'docs', section: 'Documentation' },
  { type: 'style', section: 'Styling' },
  { type: 'refactor', section: 'Code Refactoring' },
  { type: 'perf', section: 'Performance Improvements' },
  { type: 'test', section: 'Tests' },
  { type: 'build', section: 'Build System' },
  { type: 'ci', section: 'Continuous Integration' },
];

const { writer } = createPreset({ types });
const baseCommitPartial = writer.commitPartial;

export default {
  plugins: {
    '@release-it/conventional-changelog': {
      preset: { name: 'conventionalcommits', types },
      infile: 'CHANGELOG.md',
      writerOpts: {
        commitPartial: (context, commit) => {
          const entry = baseCommitPartial(context, commit);
          const body = typeof commit.body === 'string' ? commit.body.trim() : '';
          return body ? `${entry}\n\n${body}` : entry;
        },
      },
    },
  },
  git: {
    commitMessage: 'chore(release): ${version}',
    tag: false,
    push: false,
    requireUpstream: false,
  },
  npm: {
    publish: false,
  },
  github: false,
};
