const { readFile } = require('node:fs/promises');

const fs = require('node:fs');
const path = require('node:path');
const prettier = require('prettier');
const { ESLint } = require('eslint');
const stylelint = require('stylelint');
const chalk = require('chalk');
const stylelintFormatter = require('stylelint').formatters.string;

// check for host project's linting configs, otherwise use defaults
const hostProjectDir = process.cwd();

let esLintConfig;
try {
  esLintConfig = require(`${hostProjectDir}/.eslintrc.js`);
} catch (e) {
  esLintConfig = require('../.eslintrc.js');
}

let stylelintConfig;
try {
  stylelintConfig = require(`${hostProjectDir}/.stylelintrc.js`);
} catch (e) {
  stylelintConfig = require('../.stylelintrc.js');
}

let prettierConfig;
try {
  prettierConfig = require(`${hostProjectDir}/.prettierrc.js`);
} catch (e) {
  prettierConfig = require('../.prettierrc.js');
}

const logger = require('./logging');

const logging = logger.getLogger('Kolibri Linter');

const esLinter = new ESLint({
  baseConfig: esLintConfig,
  fix: true,
});

let esLintFormatter;

// Initialize a stylelint linter for each style file type that we support
// Create them here so that we can reuse, rather than creating many many objects.
const styleLangs = ['scss', 'css', 'less', 'vue', 'html'];

const errorOrChange = 1;
const noChange = 0;

async function eslint(code, file, messages) {
  const esLintOutput = await esLinter.lintText(code, { filePath: file });
  const result = esLintOutput[0];
  if (result && result.messages.length) {
    if (!esLintFormatter) {
      esLintFormatter = await esLinter.loadFormatter('stylish');
    }
    messages.push(esLintFormatter.format([result]));
  }
  return (result && result.output) || code;
}

async function prettierFormat(code, file, messages) {
  const options = Object.assign(
    {
      filepath: file,
    },
    prettierConfig,
  );
  try {
    return prettier.format(code, options);
  } catch (e) {
    messages.push(
      `${chalk.underline(file)}\n${chalk.red('Parsing error during prettier formatting:')}\n${
        e.message
      }`,
    );
  }
  return code;
}

async function lintStyle(code, file, messages) {
  // Stylelint's `lint` method requires an absolute path for the codeFilename arg
  const codeFilename = !path.isAbsolute(file) ? path.join(hostProjectDir, file) : file;
  const output = await stylelint.lint({
    code,
    codeFilename,
    config: stylelintConfig,
    fix: true,
    configBasedir: hostProjectDir,
    quietDeprecationWarnings: true,
  });
  let stylinted = code;
  if (output.results && output.results.length) {
    messages.push(stylelintFormatter(output.results));
    // There should only be one result, because we have only
    // passed it a single file, this seems to be the only way
    // to check if the `output` property of the output object has been set
    // to valid style code, as opposed to a serialized copy of the formatted
    // errors.
    // We are doing a parallel of the check being done here:
    // https://github.com/stylelint/stylelint/blob/master/lib/standalone.js#L159
    if (output.results[0]._postcssResult && !output.results[0]._postcssResult.stylelint.ignored) {
      stylinted = output.output;
    }
  }
  return stylinted;
}

async function lint({ file, write, encoding = 'utf-8', silent = false } = {}) {
  const source = await readFile(file, { encoding });
  let formatted = source;
  let messages = [];

  let extension = path.extname(file);
  if (extension.startsWith('.')) {
    extension = extension.slice(1);
  }

  // Run prettier on everything first.
  formatted = await prettierFormat(formatted, file, messages);

  // Run eslint on JS files and vue files.
  if (extension === 'js' || extension === 'vue') {
    formatted = await eslint(formatted, file, messages);
  }

  // Run stylelint on any file that can contain styles
  if (styleLangs.some(lang => lang === extension)) {
    formatted = await lintStyle(formatted, file, messages);
  }

  if (formatted !== source) {
    messages.push(chalk.yellow(`${file} did not conform to formatting standards`));
  }

  // Get rid of any empty messages
  messages = messages.filter(msg => msg.trim());
  if (!messages.length) {
    // Nothing to lint, return noChange.
    return noChange;
  }
  if (messages.length && !silent) {
    logging.info(`Linting errors for ${file}`);
    messages.forEach(msg => {
      logging.log(msg);
    });
  }
  // Only write if the formatted file is different to the source file.
  if (write && formatted !== source) {
    try {
      fs.writeFileSync(file, formatted, { encoding });
      if (!silent) {
        logging.info(`Rewriting a reformatted version of ${file}`);
      }
    } catch (error) {
      logging.error(error);
    }
  }
  return errorOrChange;
}

module.exports = {
  lint,
  logging,
  noChange,
};
