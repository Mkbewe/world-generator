module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'header-max-length': [2, 'always', 72],
    'type-case': [2, 'always', 'lower-case'],
    'scope-case': [2, 'always', 'lower-case'],
    'subject-case': [2, 'never', ['sentence-case', 'start-case', 'pascal-case', 'upper-case']],
  },
  helpUrl: '',
  formatter: '@commitlint/format',
  defaultIgnores: true,
  prompt: {
    messages: {},
    questions: {
      type: {
        description: 'Select the type of change',
      },
      subject: {
        description: 'Write a short description (start lowercase; keep acronyms and names as-is)',
      },
    },
  },
};
