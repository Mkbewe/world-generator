/** Files per spawned command; Windows command lines are too short for all of them. */
const BATCH_SIZE = 50;

function batch(command, args, files) {
  const commands = [];
  for (let index = 0; index < files.length; index += BATCH_SIZE) {
    const chunk = files.slice(index, index + BATCH_SIZE);
    commands.push([command, ...args, ...chunk].join(' '));
  }
  return commands;
}

export default {
  '*': files => batch('prettier', ['--write', '--ignore-unknown'], files),
  '*.{js,jsx,ts,tsx}': files => batch('eslint', ['--fix'], files),
  '*.scss': files => batch('stylelint', ['--fix'], files),
};
