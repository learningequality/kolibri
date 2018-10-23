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
const chokidar = require('chokidar');
const stylelintFormatter = require('stylelint').formatters.string;
const esLintConfig = require('../../.eslintrc.js');
const htmlHintConfig = require('../../.htmlhintrc.js');
const stylelintConfig = require('../../.stylelintrc.js');
const logging = require('./logging');

require('./htmlhint_custom');

logging.prefix = 'Kolibri linter: ';

const esLinter = new ESLinter();
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

function prettierFrontend({ file, write, encoding = 'utf-8', prettierOptions }) {
  return new Promise((resolve, reject) => {
    fs.readFile(file, { encoding }, (err, buffer) => {
      if (err) {
        reject({ message: err.message, code: errorOrChange });
        return;
      }
      const source = buffer.toString();
      let formatted;
      let messages = [];
      let promises = []; // Array of promises that we need to let resolve before finishing up.
      let notSoPretty = false;
      let lineOffset;
      const columnOffset = 2; // Column offset for Vue template files is always 2 as we indent.
      const options = Object.assign(
        {
          filepath: file,
        },
        prettierOptions
      );
      function eslint(code) {
        const esLintOutput = esLinter.verifyAndFix(code, esLintConfig, { filename: file });
        let linted = esLintOutput.output;
        if (esLintOutput.messages.length) {
          messages.push(esLintFormatter([esLintOutput]));
        }
        return linted;
      }
      function lintScss(code, { lineOffset = 0, columnOffset = 0 } = {}) {
        options.parser = 'scss';
        let linted = prettier.format(code, options);
        if (linted.trim() !== code.trim()) {
          notSoPretty = true;
        }
        promises.push(
          stylelint
            .lint({
              code: linted,
              codeFilename: file,
              config: stylelintConfig,
              syntax: 'scss',
            })
            .then(output => {
              if (output.results) {
                messages.push(
                  stylelintFormatter(
                    output.results.map(message => {
                      message.line += lineOffset;
                      message.column += columnOffset;
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
        // Raw JS or SCSS file
        if (file.endsWith('.js')) {
          options.parser = 'babylon';
          formatted = prettier.format(source, options);
          if (formatted !== source) {
            notSoPretty = true;
          }
          formatted = eslint(formatted);
        } else if (file.endsWith('.scss')) {
          formatted = lintScss(source);
        } else if (file.endsWith('.vue')) {
          let block;
          // First lint the whole vue component with eslint
          formatted = eslint(source);
          // Now run htmlhint on the whole vue component
          let htmlMessages = HTMLHint.verify(formatted, htmlHintConfig);
          if (htmlMessages.length) {
            messages.push(...HTMLHint.format(htmlMessages, { colors: true }));
          }

          let vueComponent = compiler.parseComponent(formatted);
          // Prettier strips the 2 space indentation that we enforce within script tags for vue
          // components. So here we account for those 2 spaces that will be added.
          options.printWidth = options.printWidth - 2;

          // Format script block
          if (vueComponent.script) {
            block = vueComponent.script;

            const js = block.content;
            options.parser = 'babylon';
            let formattedJs = prettier.format(js, options);
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
            if (block && block.lang === 'scss') {
              // Is not an empty single line style block
              if (block.content.trim().length > 0) {
                const start = block.start;
                lineOffset = formatted.slice(0, start).match(/\n/g || []).length;
                let formattedScss = lintScss(block.content, { lineOffset, columnOffset });
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
        reject({ message: e.message, code: errorOrChange });
        return;
      }
      Promise.all(promises)
        .then(() => {
          // Get rid of any empty messages
          messages = messages.filter(msg => msg.trim());
          // Wait until any asynchronous tasks have finished
          if ((!formatted || formatted === source) && !messages.length) {
            // Nothing to lint, return the source to be safe.
            resolve({ formatted: source, code: noChange });
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
                reject({ message: error.message, code: errorOrChange });
                return;
              }
              logging.info(`Rewriting a prettier version of ${file}`);
              resolve({ formatted, code });
            });
          }
        })
        .catch(err => {
          // Something went wrong, return the source to be safe.
          reject({ message: err, code: errorOrChange });
          return;
        });
    });
  });
}

if (require.main === module) {
  const program = require('commander');
  const glob = require('glob');
  const defaultGlobPattern = '{kolibri/**/assets,frontend_build,jest_config}/**/*.{js,vue,scss}';

  program
    .version('0.0.1')
    .usage('[options] <files...>')
    .arguments('<files...>')
    .option('-w, --write', 'Write to file', false)
    .option('-e, --encoding <string>', 'Text encoding of file', 'utf-8')
    .option('--prettierPath <filePath>', 'Path to prettier bin')
    .option('-v, --verbose', 'Print output to stdout', false)
    .option('-m, --monitor', 'Monitor files and check on change', false)
    .parse(process.argv);
  const watchMode = program.monitor;
  const files = program.args.length ? program.args : [defaultGlobPattern];
  const baseOptions = Object.assign({}, program);
  if (baseOptions.prettierPath) {
    baseOptions.prettierOptions = require(path.resolve(process.cwd(), baseOptions.prettierPath));
    delete baseOptions.prettierPath;
  }
  const logSuccess = formatted => {
    if (!baseOptions.write && baseOptions.verbose) {
      logging.log(formatted.formatted);
    }
    return formatted.code;
  };
  if (!files.length) {
    program.help();
  } else {
    const runPrettier = file => prettierFrontend(Object.assign({}, baseOptions, { file }));
    if (watchMode) {
      logging.info('Initializing watcher for the following patterns: ' + files.join(', '));
      const watcher = chokidar.watch(files, { ignored: /node_modules/ });
      watcher.on('change', runPrettier);
    } else {
      Promise.all(
        files.map(file => {
          const matches = glob.sync(file, {
            ignore: ['**/node_modules/**'],
          });
          return Promise.all(
            matches.map(globbedFile => {
              return runPrettier(globbedFile)
                .then(logSuccess)
                .catch(error => {
                  console.log(globbedFile, error);
                  logging.error('Error: ', error.message);
                  return error.code;
                });
            })
          ).then(sources => {
            return sources.reduce((code, result) => {
              return Math.max(code, result);
            }, noChange);
          });
        })
      ).then(sources => {
        process.exit(
          sources.reduce((code, result) => {
            return Math.max(code, result);
          }, noChange)
        );
      });
    }
  }
}

module.exports = prettierFrontend;
