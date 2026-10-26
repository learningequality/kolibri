const { readFile } = require('node:fs/promises');

const fs = require('node:fs');
const { createRequire } = require('node:module');
const path = require('node:path');
const prettier = require('prettier');
const { ESLint } = require('eslint');
const chalk = require('chalk');
const logger = require('kolibri-logging');

// check for host project's linting configs, otherwise use defaults
const hostProjectDir = process.cwd();

// Find the ESLint flat config file (can't use require() for .mjs, so use fs.existsSync)
const hostEsLintConfig = path.join(hostProjectDir, 'eslint.config.mjs');
const esLintConfigFile = fs.existsSync(hostEsLintConfig)
  ? hostEsLintConfig
  : path.join(__dirname, 'eslint.config.mjs');

let stylelintConfig;
try {
  stylelintConfig = require(`${hostProjectDir}/.stylelintrc`);
} catch (e) {
  stylelintConfig = require('./.stylelintrc');
}

function globFromHostProjectDir(glob) {
  return glob.startsWith('!')
    ? `!${path.resolve(hostProjectDir, glob.slice(1))}`
    : path.resolve(hostProjectDir, glob);
}

// stylelint also matches each non-negated `overrides[].files` glob, unresolved, against the
// basename, which is how a glob without a `/` matches in any directory
function overrideGlobsFromHostProjectDir(glob) {
  if (glob.startsWith('!') || (glob.includes('/') && !glob.startsWith('**/'))) {
    return [globFromHostProjectDir(glob)];
  }
  return glob.startsWith('**/') ? [glob, globFromHostProjectDir(glob)] : [glob];
}

// stylelint resolves `ignoreFiles` and `overrides[].files` against `configBasedir`
stylelintConfig = {
  ...stylelintConfig,
  ...(stylelintConfig.ignoreFiles && {
    ignoreFiles: [stylelintConfig.ignoreFiles].flat().map(globFromHostProjectDir),
  }),
  ...(stylelintConfig.overrides && {
    overrides: stylelintConfig.overrides.map(override => ({
      ...override,
      files: [override.files].flat().flatMap(overrideGlobsFromHostProjectDir),
    })),
  }),
};

let prettierConfig;
try {
  prettierConfig = require(`${hostProjectDir}/.prettierrc`);
} catch (e) {
  prettierConfig = require('./.prettierrc');
}

const logging = logger.getLogger('Kolibri Format');

logging.setLevel(2);

const esLinter = new ESLint({
  overrideConfigFile: esLintConfigFile,
  fix: true,
});

let esLintFormatter;

// Initialize a stylelint linter for each style file type that we support
// Create them here so that we can reuse, rather than creating many many objects.
const styleLangs = ['scss', 'css', 'less', 'vue', 'html'];
const postcssHtmlLangs = ['vue', 'html'];

const errorOrChange = 1;
const noChange = 0;

async function eslint(code, file, messages) {
  const esLintOutput = await esLinter.lintText(code, { filePath: file });
  const result = esLintOutput[0];
  let errored = false;
  if (result && result.messages.length) {
    if (!esLintFormatter) {
      esLintFormatter = await esLinter.loadFormatter('stylish');
    }
    messages.push(esLintFormatter.format([result]));
    errored = result.errorCount > 0;
  }
  return { formatted: (result && result.output) || code, errored };
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

let onePostcssAsserted = false;

// stylelint 17 exempts inline `style` attributes from `no-invalid-position-declaration` with
// `instanceof` against its own postcss, so a second copy in postcss-html fails every one
function assertOnePostcss() {
  if (onePostcssAsserted) {
    return;
  }
  const stylelintRequire = createRequire(require.resolve('stylelint/package.json'));
  const postcssHtmlRequire = createRequire(stylelintRequire.resolve('postcss-html'));
  const stylelintPostcss = stylelintRequire.resolve('postcss');
  const postcssHtmlPostcss = postcssHtmlRequire.resolve('postcss');
  if (stylelintPostcss !== postcssHtmlPostcss) {
    throw new Error(
      `stylelint loads ${stylelintPostcss} but postcss-html loads ${postcssHtmlPostcss}, ` +
        'so stylelint would reject every inline style declaration. Install one postcss in ' +
        "stylelint's range: dedupe postcss in your lockfile (`npm dedupe postcss`, `pnpm dedupe`, …), " +
        'lifting any postcss pin that blocks it.',
    );
  }
  onePostcssAsserted = true;
}

function usesPostcssHtml(file) {
  return postcssHtmlLangs.includes(path.extname(file).slice(1));
}

async function lintStyle(code, file, messages) {
  if (usesPostcssHtml(file)) {
    assertOnePostcss();
  }
  const { default: stylelint } = await import('stylelint');
  // Stylelint's `lint` method requires an absolute path for the codeFilename arg
  const codeFilename = !path.isAbsolute(file) ? path.join(hostProjectDir, file) : file;
  const stringFormatter = await stylelint.formatters.string;
  const output = await stylelint.lint({
    code,
    codeFilename,
    config: stylelintConfig,
    fix: true,
    configBasedir: __dirname,
    // stylelint's string formatter reads `ruleMetadata` to suggest a `--fix` option,
    // which kolibri-format does not have
    formatter: (results, returnValue) =>
      stringFormatter(results, { ...returnValue, ruleMetadata: {} }),
    quietDeprecationWarnings: true,
  });
  messages.push(output.report);
  return { errored: output.errored, formatted: output.code ?? code };
}

async function lintSource({ file, source }) {
  let formatted = source;
  const messages = [];
  let extension = path.extname(file);
  let errored = false;

  if (extension.startsWith('.')) {
    extension = extension.slice(1);
  }

  // Run prettier on everything first.
  // Unlike eslint and stylelint, prettier is not a linter, so we don't
  // need to check for errors, we just want to format the code.
  formatted = await prettierFormat(formatted, file, messages);

  // Run eslint on JS files and vue files.
  if (extension === 'js' || extension === 'vue') {
    const result = await eslint(formatted, file, messages);
    formatted = result.formatted;
    errored = errored || result.errored;
  }

  // Run stylelint on any file that can contain styles
  if (styleLangs.some(lang => lang === extension)) {
    const result = await lintStyle(formatted, file, messages);
    formatted = result.formatted;
    errored = errored || result.errored;
  }

  // Get rid of any empty messages
  return { formatted, messages: messages.filter(msg => msg.trim()), errored };
}

async function lint({ file, write, encoding = 'utf-8', silent = false } = {}) {
  const source = await readFile(file, { encoding });

  const { formatted, messages, errored } = await lintSource({ file, source });

  const reformatRequired = formatted !== source;

  if (!reformatRequired && !messages.length) {
    // Nothing to lint, return noChange.
    return noChange;
  }
  if ((reformatRequired || messages.length) && !silent) {
    if (errored) {
      logging.error(`Linting errors for ${chalk.underline(file)}`);
    } else {
      logging.warn(`Linting warnings for ${chalk.underline(file)}`);
    }
    if (reformatRequired) {
      logging.warn(`${file} needs to be reformatted.`);
    }
    messages.forEach(msg => {
      // Use console.log for non-prefixed output for linting messages
      console.log(msg); // eslint-disable-line no-console
    });
  }
  // Only write if the formatted file is different to the source file.
  if (write && reformatRequired) {
    try {
      fs.writeFileSync(file, formatted, { encoding });
      if (!silent) {
        logging.info(`Rewriting a reformatted version of ${file}`);
      }
    } catch (error) {
      logging.error(error);
    }
  }
  if (!errored && !reformatRequired) {
    // No errors, and no reformatting required.
    return noChange;
  }
  return errorOrChange;
}

function writeSourceToFile(filePath, fileSource) {
  fs.writeFileSync(filePath, fileSource, { encoding: 'utf-8' });

  return lint({
    file: filePath,
    write: true,
    silent: true,
  }).catch(error => {
    logging.error(error);
    process.exitCode = 1;
  });
}

module.exports = {
  assertOnePostcss,
  errorOrChange,
  lint,
  lintSource,
  logging,
  noChange,
  usesPostcssHtml,
  writeSourceToFile,
};
