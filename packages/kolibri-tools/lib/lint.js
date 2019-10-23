const fs = require('fs');
const path = require('path');
const prettier = require('prettier');
const compiler = require('vue-template-compiler');
const ESLintCLIEngine = require('eslint').CLIEngine;
const HTMLHint = require('htmlhint').HTMLHint;
const esLintFormatter = require('eslint/lib/formatters/stylish');
const stylelint = require('stylelint');
const colors = require('colors');
const stylelintFormatter = require('stylelint').formatters.string;

require('./htmlhint_custom');

// check for host project's linting configs, otherwise use defaults
let hostProjectDir = process.cwd();

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

let htmlHintConfig;
try {
  htmlHintConfig = require(`${hostProjectDir}/.htmlhintrc.js`);
} catch (e) {
  htmlHintConfig = require('../.htmlhintrc.js');
}

let prettierConfig;
try {
  prettierConfig = require(`${hostProjectDir}/.prettierrc.js`);
} catch (e) {
  prettierConfig = require('../.prettierrc.js');
}

const logger = require('./logging');

const logging = logger.getLogger('Kolibri Linter');

const esLinter = new ESLintCLIEngine({
  baseConfig: esLintConfig,
  fix: true,
});

// Initialize a stylelint linter for each style file type that we support
// Create them here so that we can reuse, rather than creating many many objects.
const styleLangs = ['scss', 'css', 'less'];
const styleLinters = {};
styleLangs.forEach(lang => {
  styleLinters[lang] = stylelint.createLinter({
    config: stylelintConfig,
    syntax: lang,
    fix: true,
    configBasedir: path.resolve(__dirname, '..'),
  });
});

const errorOrChange = 1;
const noChange = 0;
/*
  Modifications to match our component linting conventions.
  Surround style and script blocks by 2 new lines and ident.
*/
function indentAndAddNewLines(str) {
  if (str) {
    str = str.replace(/^(\n)*/, '\n\n');
    str = str.replace(/(\n)*$/, '\n\n');
    str = str.replace(/(.*\S.*)/g, '  $1');
    return str;
  }
}

function insertContent(source, block, formatted) {
  if (source) {
    const start = block.start;
    const end = block.end;
    const indented = indentAndAddNewLines(formatted);
    return source.replace(source.slice(start, end), indented);
  }
}

function lint({ file, write, encoding = 'utf-8', silent = false } = {}) {
  return new Promise((resolve, reject) => {
    fs.readFile(file, { encoding }, (err, buffer) => {
      if (err) {
        reject({ error: err.message, code: errorOrChange });
        return;
      }
      const source = buffer.toString();
      let formatted = source;
      let messages = [];
      // Array of promises that we need to let resolve before finishing up.
      let promises = [];
      // Array of callbacks to call to apply changes to style blocks.
      // Store for application after linting has completed to prevent race conditions.
      let styleCodeUpdates = [];
      let notSoPretty = false;
      let lineOffset;
      function eslint(code) {
        const esLintOutput = esLinter.executeOnText(code, file);
        const result = esLintOutput.results[0];
        if (result && result.messages.length) {
          result.filePath = file;
          messages.push(esLintFormatter([result]));
        }
        return (result && result.output) || code;
      }
      function prettierFormat(code, parser, vue = false) {
        const options = Object.assign(
          {
            filepath: file,
          },
          prettierConfig,
          {
            parser,
          }
        );
        if (vue) {
          // Prettier strips the 2 space indentation that we enforce within script tags for vue
          // components. So here we account for those 2 spaces that will be added.
          options.printWidth -= 2;
        }
        let linted = code;
        try {
          linted = prettier.format(code, options);
        } catch (e) {
          messages.push(
            `${colors.underline(file)}\n${colors.red(
              'Parsing error during prettier formatting:'
            )}\n${e.message}`
          );
        }
        return linted;
      }
      function lintStyle(code, style, callback, { lineOffset = 0, vue = false } = {}) {
        // Stylelint's `lint` method requires an absolute path for the codeFilename arg
        const codeFilename = !path.isAbsolute(file) ? path.join(process.cwd(), file) : file;
        promises.push(
          stylelint
            .lint({
              code,
              codeFilename,
              config: stylelintConfig,
              // For reasons beyond my ken, stylint borks on css files
              // Fortunately, scss is a superset of css, so this works.
              syntax: style === 'css' ? 'scss' : style,
              fix: true,
              configBasedir: path.resolve(__dirname, '..'),
            })
            .then(output => {
              let stylinted;
              if (output.results && output.results.length) {
                messages.push(
                  stylelintFormatter(
                    output.results.map(result => {
                      result.warnings = result.warnings.map(message => {
                        message.line += lineOffset;
                        // Column offset for Vue template files is always 2 as we indent.
                        message.column += vue ? 2 : 0;
                        return message;
                      });
                      return result;
                    })
                  )
                );
                // There should only be one result, because we have only
                // passed it a single file, this seems to be the only way
                // to check if the `output` property of the output object has been set
                // to valid style code, as opposed to a serialized copy of the formatted
                // errors.
                // We are doing a parallel of the check being done here:
                // https://github.com/stylelint/stylelint/blob/master/lib/standalone.js#L159
                if (
                  output.results[0]._postcssResult &&
                  !output.results[0]._postcssResult.stylelint.ignored
                ) {
                  stylinted = output.output;
                }
              }
              let linted = prettierFormat(stylinted || code, style, vue);

              if (linted.trim() !== (stylinted || code).trim()) {
                notSoPretty = true;
              }

              styleCodeUpdates.push(() => callback(linted));
            })
            .catch(err => {
              messages.push(err.toString());
            })
        );
      }
      try {
        let extension = path.extname(file);
        if (extension.startsWith('.')) {
          extension = extension.slice(1);
        }
        // Raw JS
        if (extension === 'js') {
          formatted = prettierFormat(source, 'babel');
          if (formatted !== source) {
            notSoPretty = true;
          }
          formatted = eslint(formatted);
          // Recognized style file
        } else if (styleLangs.some(lang => lang === extension)) {
          lintStyle(source, extension, updatedCode => {
            formatted = updatedCode;
          });
        } else if (extension === 'vue') {
          let block;
          // First lint the whole vue component with eslint
          formatted = eslint(source);

          let vueComponent = compiler.parseComponent(formatted);

          // Format template block
          if (vueComponent.template && vueComponent.template.content) {
            formatted = insertContent(
              formatted,
              vueComponent.template,
              vueComponent.template.content
            );
            vueComponent = compiler.parseComponent(formatted);
          }

          // Now run htmlhint on the whole vue component
          let htmlMessages = HTMLHint.verify(formatted, htmlHintConfig);
          if (htmlMessages.length) {
            messages.push(...HTMLHint.format(htmlMessages, { colors: true }));
          }

          // Format script block
          if (vueComponent.script) {
            block = vueComponent.script;

            const js = block.content;
            let formattedJs = prettierFormat(js, 'babel', true);
            formatted = insertContent(formatted, block, formattedJs);
            if (formattedJs.trim() !== js.trim()) {
              notSoPretty = true;
            }
          }

          // Format style blocks
          for (let i = 0; i < vueComponent.styles.length; i++) {
            // Reparse to get updated line numbers
            block = compiler.parseComponent(formatted).styles[i];

            // Is a scss style block
            if (block && styleLangs.some(lang => lang === block.lang)) {
              // Is not an empty single line style block
              if (block.content.trim().length > 0) {
                const start = block.start;
                lineOffset = formatted.slice(0, start).match(/\n/g || []).length;
                const index = i;
                const callback = updatedCode => {
                  const block = compiler.parseComponent(formatted).styles[index];
                  formatted = insertContent(formatted, block, updatedCode);
                };
                lintStyle(block.content, block.lang, callback, { lineOffset, vue: true });
              }
            }
          }
        }
        if (notSoPretty) {
          messages.push(colors.yellow(`${file} did not conform to prettier standards`));
        }
      } catch (e) {
        // Something went wrong, return the source to be safe.
        reject({ error: e.message, code: errorOrChange });
        return;
      }
      Promise.all(promises)
        .then(() => {
          // Get rid of any empty messages
          messages = messages.filter(msg => msg.trim());
          // Wait until any asynchronous tasks have finished
          styleCodeUpdates.forEach(update => update());
          if ((!formatted || formatted === source) && !messages.length) {
            // Nothing to lint, return the source to be safe.
            resolve({ code: noChange });
            return;
          }
          const code = errorOrChange;
          if (messages.length && !silent) {
            logging.log('');
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
                logging.info(`Rewriting a prettier version of ${file}`);
              }
            } catch (error) {
              reject({ error: error.message, code: errorOrChange });
              return;
            }
          }
          resolve({ code });
        })
        .catch(err => {
          // Something went wrong, return the source to be safe.
          reject({ error: err, code: errorOrChange });
          return;
        });
    });
  });
}

module.exports = {
  lint,
  logging,
  noChange,
};
