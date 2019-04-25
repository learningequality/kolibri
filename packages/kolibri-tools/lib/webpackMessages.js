/*
 * Vendored from https://github.com/lukeed/webpack-messages and https://github.com/lukeed/webpack-format-messages
 */
const logger = require('./logging');

const logging = logger.getLogger('Kolibri Build');

const errorLabel = 'Syntax error:';
const isLikelyASyntaxError = str => str.includes(errorLabel);

const exportRegex = /\s*(.+?)\s*(")?export '(.+?)' was not found in '(.+?)'/;
const stackRegex = /^\s*at\s((?!webpack:).)*:\d+:\d+[\s)]*(\n|$)/gm;

function formatMessage(message) {
  let lines = message.split('\n');

  if (lines.length > 2 && lines[1] === '') {
    lines.splice(1, 1); // Remove extra newline.
  }

  // Remove loader notation from filenames:
  //   `./~/css-loader!./src/App.css` ~~> `./src/App.css`
  if (lines[0].lastIndexOf('!') !== -1) {
    lines[0] = lines[0].substr(lines[0].lastIndexOf('!') + 1);
  }

  // Remove useless `entry` filename stack details
  lines = lines.filter(line => line.indexOf(' @ ') !== 0);

  // 0 ~> filename; 1 ~> main err msg
  if (!lines[0] || !lines[1]) {
    return lines.join('\n');
  }

  // Cleans up verbose "module not found" messages for files and packages.
  if (lines[1].startsWith('Module not found: ')) {
    lines = [
      lines[0],
      lines[1] // "Module not found: " is enough detail
        .replace("Cannot resolve 'file' or 'directory' ", '')
        .replace('Cannot resolve module ', '')
        .replace('Error: ', '')
        .replace('[CaseSensitivePathsPlugin] ', ''),
    ];
  }

  // Cleans up syntax error messages.
  if (lines[1].startsWith('Module build failed: ')) {
    lines[1] = lines[1].replace('Module build failed: SyntaxError:', errorLabel);
  }

  if (lines[1].match(exportRegex)) {
    lines[1] = lines[1].replace(exportRegex, "$1 '$4' does not contain an export named '$3'.");
  }

  // Reassemble & Strip internal tracing, except `webpack:` -- (create-react-app/pull/1050)
  return lines
    .join('\n')
    .replace(stackRegex, '')
    .trim();
}

const format = stats => {
  const json = stats.toJson({}, true);

  const result = {
    errors: json.errors.map(msg => formatMessage(msg)),
    warnings: json.warnings.map(msg => formatMessage(msg)),
  };

  // Only show syntax errors if we have them
  if (result.errors.some(isLikelyASyntaxError)) {
    result.errors = result.errors.filter(isLikelyASyntaxError);
  }

  // First error is usually it; others usually the same
  if (result.errors.length > 1) {
    result.errors.length = 1;
  }

  return result;
};

const NAME = 'webpack-messages';

class WebpackMessages {
  constructor(opts) {
    opts = opts || {};
    this.name = opts.name;
    this.onDone = opts.onComplete;
  }

  format(str, arr) {
    return str + '\n' + (arr || []).join('') + '\n';
  }

  apply(compiler) {
    const name = this.name ? `${this.name} bundle` : '';
    const onStart = () => logging.info(`Building ${name}...`);

    const onComplete = stats => {
      const messages = format(stats);

      if (messages.errors.length) {
        return logging.error(this.format(`Failed to compile${name}!`, messages.errors));
      }

      if (messages.warnings.length) {
        return logging.warn(this.format(`Compiled ${name} with warnings.`, messages.warnings));
      }

      if (this.onDone !== undefined) {
        this.onDone(name, stats);
      } else {
        const sec = (stats.endTime - stats.startTime) / 1e3;
        logging.info(`Completed ${name} in ${sec}s!`);
      }
    };

    if (compiler.hooks !== void 0) {
      compiler.hooks.compile.tap(NAME, onStart);
      compiler.hooks.invalid.tap(NAME, onStart);
      compiler.hooks.done.tap(NAME, onComplete);
    } else {
      compiler.plugin('compile', onStart);
      compiler.plugin('invalid', onStart);
      compiler.plugin('done', onComplete);
    }
  }
}

module.exports = WebpackMessages;
