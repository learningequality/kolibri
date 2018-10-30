/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const prettier = require('prettier');
const compiler = require('vue-template-compiler');
const ESLinter = require('eslint').Linter;
const HTMLHint = require('htmlhint').HTMLHint;
const esLintFormatter = require('eslint/lib/formatters/stylish');
const stylelint = require('stylelint');
const colors = require('colors');
const stylelintFormatter = require('stylelint').formatters.string;
const prettierOptions = require('../.prettier.js');
const esLintConfig = require('../.eslintrc.js');
const htmlHintConfig = require('../.htmlhintrc.js');
const stylelintConfig = require('../.stylelintrc.js');
const logger = require('./logging');

require('./htmlhint_custom');

const logging = logger.getLogger('Kolibri linter');

const esLinter = new ESLinter();

// Initialize a stylelint linter for each style file type that we support
// Create them here so that we can reuse, rather than creating many many objects.
const styleLangs = ['scss', 'css', 'less'];
const styleLinters = {};
styleLangs.forEach(lang => {
  styleLinters[lang] = stylelint.createLinter({ config: Object.assign({}, stylelintConfig, { syntax: lang }) });
});

const errorOrChange = 1;
const noChange = 0;
/*
  Modifications to match our component linting conventions.
  Surround style and script blocks by 2 new lines and ident.
*/
function indentAndAddNewLines(str) {
  str = str.replace(/^(\n)*/, '\n\n');
  str = str.replace(/(\n)*$/, '\n\n');
  str = str.replace(/(.*\S.*)/g, '  $1');
  return str;
}

function insertContent(source, block, formatted) {
  const start = block.start;
  const end = block.end;
  const indented = indentAndAddNewLines(formatted);
  return source.replace(source.slice(start, end), indented);
}

function lint({ file, write, encoding = 'utf-8' }) {
  return new Promise((resolve, reject) => {
    fs.readFile(file, { encoding }, (err, buffer) => {
      if (err) {
        reject({ error: err.message, code: errorOrChange });
        return;
      }
      const source = buffer.toString();
      let formatted;
      let messages = [];
      let promises = []; // Array of promises that we need to let resolve before finishing up.
      let notSoPretty = false;
      let lineOffset;
      const options = (parser, vue = false) => {
        const options = Object.assign(
          {
            filepath: file,
          },
          prettierOptions,
          {
            parser,
          }
        );
        if (vue) {
          // Prettier strips the 2 space indentation that we enforce within script tags for vue
          // components. So here we account for those 2 spaces that will be added.
          options.printWidth -= 2;
        }
        return options;
      }
      function eslint(code) {
        const esLintOutput = esLinter.verifyAndFix(code, esLintConfig, { filename: file });
        let linted = esLintOutput.output;
        if (esLintOutput.messages.length) {
          messages.push(esLintFormatter([esLintOutput]));
        }
        return linted;
      }
      function lintStyle(code, style, { lineOffset = 0, vue = false } = {}) {
        let linted = prettier.format(code, options(style));
        if (linted.trim() !== code.trim()) {
          notSoPretty = true;
        }
        // Stylelint's `_lintSource` method requires an absolute path for the codeFilename arg
        const codeFilename = !path.isAbsolute(file) ? path.join(process.cwd(), file) : file;
        promises.push(
          styleLinters[style]
            ._lintSource({
              code: linted,
              codeFilename,
            })
            .then(output => {
              if (output.results) {
                messages.push(
                  stylelintFormatter(
                    output.results.map(message => {
                      message.line += lineOffset;
                      // Column offset for Vue template files is always 2 as we indent.
                      message.column += vue ? 2 : 0;
                      return message;
                    })
                  )
                );
              }
            })
        );
        return linted;
      }
      try {
        let extension = path.extname(file);
        if (extension.startsWith('.')) {
          extension = extension.slice(1);
        }
        // Raw JS
        if (extension === 'js') {
          formatted = prettier.format(source, options('babylon'));
          if (formatted !== source) {
            notSoPretty = true;
          }
          formatted = eslint(formatted);
        // Recognized style file
        } else if (styleLangs.some(lang => lang === extension)) {
          formatted = lintStyle(source, extension);
        } else if (extension === 'vue') {
          let block;
          // First lint the whole vue component with eslint
          formatted = eslint(source);
          // Now run htmlhint on the whole vue component
          let htmlMessages = HTMLHint.verify(formatted, htmlHintConfig);
          if (htmlMessages.length) {
            messages.push(...HTMLHint.format(htmlMessages, { colors: true }));
          }

          let vueComponent = compiler.parseComponent(formatted);

          // Format script block
          if (vueComponent.script) {
            block = vueComponent.script;

            const js = block.content;
            let formattedJs = prettier.format(js, options('babylon', true));
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
                let formattedScss = lintStyle(block.content, block.lang, { lineOffset, vue: true });
                formatted = insertContent(formatted, block, formattedScss);
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
          if ((!formatted || formatted === source) && !messages.length) {
            // Nothing to lint, return the source to be safe.
            resolve({ code: noChange });
            return;
          }
          const code = errorOrChange;
          if (messages.length) {
            logging.log('');
            logging.info(`Linting errors for ${file}`);
            messages.forEach(msg => {
              logging.log(msg);
            });
          }
          // Only write if the formatted file is different to the source file.
          if (write && formatted !== source) {
            fs.writeFile(file, formatted, { encoding }, error => {
              if (error) {
                reject({ error: error.message, code: errorOrChange });
                return;
              }
              logging.info(`Rewriting a prettier version of ${file}`);
              resolve({ code });
            });
          }
        })
        .catch(err => {
          console.log(err);
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
