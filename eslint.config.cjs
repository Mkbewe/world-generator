const { FlatCompat } = require('@eslint/eslintrc');
const js = require('@eslint/js');
const boundaries = require('eslint-plugin-boundaries');
const checkFile = require('eslint-plugin-check-file');

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
});

module.exports = [
  ...compat.config(require('./.eslintrc.json')),
  {
    plugins: {
      'check-file': checkFile,
    },
    rules: {
      'check-file/filename-naming-convention': [
        'error',
        {
          '**/*.{js,jsx,ts,tsx}': 'KEBAB_CASE',
        },
        {
          ignoreMiddleExtensions: true,
        },
      ],
      'check-file/folder-naming-convention': [
        'error',
        {
          '**/': 'KEBAB_CASE',
        },
      ],
    },
  },
  {
    files: ['src/components/**/*.tsx'],
    ignores: ['**/*.test.tsx'],
    rules: {
      'max-lines': ['error', { max: 200, skipBlankLines: true, skipComments: true }],
    },
  },
  {
    files: ['src/**/*.{ts,tsx}', 'shared/**/*.ts', 'api/**/*.ts'],
    plugins: {
      boundaries,
    },
    settings: {
      'boundaries/root-path': __dirname,
      'import/resolver': {
        node: {
          extensions: ['.js', '.jsx', '.ts', '.tsx'],
        },
      },
      'boundaries/elements': [
        { type: 'generator', pattern: 'src/utils/map-generator/**', partialMatch: false },
        { type: 'layers', pattern: 'src/utils/map-layers/**', partialMatch: false },
        { type: 'renderer', pattern: 'src/utils/map-renderer/**', partialMatch: false },
        { type: 'readout', pattern: 'src/utils/map-readout/**', partialMatch: false },
        { type: 'utils', pattern: 'src/utils/**', partialMatch: false },
        { type: 'stores', pattern: 'src/stores/**', partialMatch: false },
        { type: 'components', pattern: 'src/components/**', partialMatch: false },
        { type: 'layouts', pattern: 'src/layouts/**', partialMatch: false },
        { type: 'pages', pattern: 'src/pages/**', partialMatch: false },
        { type: 'hooks', pattern: 'src/hooks/**', partialMatch: false },
        { type: 'feature-flags', pattern: 'src/feature-flags/**', partialMatch: false },
        { type: 'config', pattern: 'src/config/**', partialMatch: false },
        { type: 'theme', pattern: 'src/theme/**', partialMatch: false },
        { type: 'legacy-generator', pattern: 'src/legacy-generator/**', partialMatch: false },
        { type: 'app', pattern: 'src/*.{ts,tsx}', partialMatch: false },
        { type: 'shared', pattern: 'shared/**', partialMatch: false },
        { type: 'api', pattern: 'api/**', partialMatch: false },
      ],
    },
    rules: {
      'boundaries/dependencies': [
        'error',
        {
          default: 'allow',
          policies: [
            {
              from: [{ element: { type: 'generator' } }],
              disallow: [
                { to: { element: { type: 'layers' } } },
                { to: { element: { type: 'renderer' } } },
                { to: { element: { type: 'readout' } } },
                { to: { element: { type: 'stores' } } },
                { to: { element: { type: 'components' } } },
                { to: { element: { type: 'layouts' } } },
                { to: { element: { type: 'pages' } } },
                { to: { element: { type: 'hooks' } } },
                { to: { element: { type: 'feature-flags' } } },
                { to: { element: { type: 'config' } } },
                { to: { element: { type: 'theme' } } },
                { to: { element: { type: 'legacy-generator' } } },
                { to: { element: { type: 'app' } } },
                { to: { element: { type: 'api' } } },
              ],
              message: 'The generator must stay independent of rendering and UI layers.',
            },
            {
              from: [{ element: { type: 'renderer' } }],
              disallow: [
                { to: { element: { type: 'stores' } } },
                { to: { element: { type: 'components' } } },
                { to: { element: { type: 'layouts' } } },
                { to: { element: { type: 'pages' } } },
                { to: { element: { type: 'feature-flags' } } },
                { to: { element: { type: 'config' } } },
                { to: { element: { type: 'theme' } } },
                { to: { element: { type: 'legacy-generator' } } },
                { to: { element: { type: 'app' } } },
                { to: { element: { type: 'api' } } },
              ],
              message: 'The renderer must stay independent of UI layers.',
            },
            {
              from: [{ element: { type: 'layers' } }],
              disallow: [
                { to: { element: { type: 'renderer' } } },
                { to: { element: { type: 'stores' } } },
                { to: { element: { type: 'components' } } },
                { to: { element: { type: 'layouts' } } },
                { to: { element: { type: 'pages' } } },
                { to: { element: { type: 'feature-flags' } } },
                { to: { element: { type: 'config' } } },
                { to: { element: { type: 'theme' } } },
                { to: { element: { type: 'legacy-generator' } } },
                { to: { element: { type: 'app' } } },
                { to: { element: { type: 'api' } } },
              ],
              message: 'Map layers must stay independent of the renderer and UI.',
            },
            {
              from: [{ element: { type: 'readout' } }],
              disallow: [
                { to: { element: { type: 'stores' } } },
                { to: { element: { type: 'components' } } },
                { to: { element: { type: 'layouts' } } },
                { to: { element: { type: 'pages' } } },
                { to: { element: { type: 'feature-flags' } } },
                { to: { element: { type: 'config' } } },
                { to: { element: { type: 'theme' } } },
                { to: { element: { type: 'legacy-generator' } } },
                { to: { element: { type: 'app' } } },
                { to: { element: { type: 'api' } } },
              ],
              message: 'Map readout must stay independent of UI layers.',
            },
          ],
        },
      ],
    },
  },
];
