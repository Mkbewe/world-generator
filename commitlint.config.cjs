module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-case': [2, 'always', 'lower-case'],
    'scope-case': [2, 'always', 'lower-case'],
    'subject-case': [2, 'always', 'lower-case'],
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
        description: 'Write a short description (lowercase)',
      },
    },
  },
};
