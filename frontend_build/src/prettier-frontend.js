/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const prettier = require('prettier');
const compiler = require('vue-template-compiler');

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

function prettierFrontend({ file, write, encoding = 'utf-8', prettierOptions }) {
  return new Promise((resolve, reject) => {
    fs.readFile(file, { encoding }, (err, buffer) => {
      if (err) {
        reject({ message: err.message, code: errorOrChange });
        return;
      }
      const source = buffer.toString();
      let formatted;
      const options = Object.assign(
        {
          filepath: file,
        },
        prettierOptions
      );
      try {
        // Raw JS or SCSS file
        if (file.endsWith('.js')) {
          options.parser = 'babylon';
          formatted = prettier.format(source, options);
        } else if (file.endsWith('.scss')) {
          options.parser = 'scss';
          formatted = prettier.format(source, options);
        } else if (file.endsWith('.vue')) {
          let vueComponent = compiler.parseComponent(source);
          // Prettier strips the 2 space indentation that we enforce within script tags for vue
          // components. So here we account for those 2 spaces that will be added.
          options.printWidth = options.printWidth - 2;

          // Format script block
          if (vueComponent.script) {
            options.parser = 'babylon';

            const scriptStart = vueComponent.script.start;
            const scriptEnd = vueComponent.script.end;

            const js = source.slice(scriptStart, scriptEnd).replace(/(\n) {2}/g, '$1');
            let formattedJs = prettier.format(js, options);
            formattedJs = indentAndAddNewLines(formattedJs);
            formatted = source.replace(source.slice(scriptStart, scriptEnd), formattedJs);
          }

          // Format style blocks
          for (let i = 0; i < vueComponent.styles.length; i++) {
            // Reparse to get updated line numbers
            const styleBlock = compiler.parseComponent(formatted).styles[i];

            // Is a scss style block
            if (styleBlock && styleBlock.lang === 'scss') {
              options.parser = 'scss';

              const start = styleBlock.start;
              const end = styleBlock.end;

              // Is not an empty single line style block
              if (start !== end || styleBlock.content.trim().length > 0) {
                const scss = formatted.slice(start, end);
                let formattedScss = prettier.format(scss, options);
                formattedScss = indentAndAddNewLines(formattedScss);
                formatted = formatted.replace(formatted.slice(start, end), formattedScss);
              }
            }
          }
        }
      } catch (e) {
        // Something went wrong, return the source to be safe.
        reject({ message: e.message, code: errorOrChange });
        return;
      }
      if (!formatted || formatted === source) {
        // Nothing to lint, return the source to be safe.
        resolve({ formatted: source, code: noChange });
        return;
      }
      const code = errorOrChange;
      if (write) {
        fs.writeFile(file, formatted, { encoding }, error => {
          if (error) {
            reject({ message: error.message, code: errorOrChange });
            return;
          }
          console.log(`Rewriting a prettier version of ${file}`);
          resolve({ formatted, code });
        });
      } else {
        console.log(`${file} did not conform to prettier standards`);
        resolve({ formatted, code });
      }
    });
  });
}

if (require.main === module) {
  const program = require('commander');
  const glob = require('glob');
  const defaultGlobPattern = './{kolibri/**/assets,frontend_build,karma_config}/**/*.{js,vue,scss}';

  program
    .version('0.0.1')
    .usage('[options] <files...>')
    .arguments('<files...>')
    .option('-w, --write', 'Write to file', false)
    .option('-e, --encoding <string>', 'Text encoding of file', 'utf-8')
    .option('--prettierPath <filePath>', 'Path to prettier bin')
    .option('-v, --verbose', 'Print output to stdout', false)
    .parse(process.argv);
  const files = program.args.length ? program.args : [defaultGlobPattern];
  const baseOptions = Object.assign({}, program);
  if (baseOptions.prettierPath) {
    baseOptions.prettierOptions = require(path.resolve(process.cwd(), baseOptions.prettierPath));
    delete baseOptions.prettierPath;
  }
  const logSuccess = formatted => {
    if (!baseOptions.write && baseOptions.verbose) {
      console.log(formatted.formatted);
    }
    return formatted.code;
  };
  if (!files.length) {
    program.help();
  } else {
    Promise.all(
      files.map(file => {
        const matches = glob.sync(file);
        return Promise.all(
          matches.map(globbedFile => {
            return prettierFrontend(Object.assign({}, baseOptions, { file: globbedFile }))
              .then(logSuccess)
              .catch(error => {
                console.log('Error: ', error.message);
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

module.exports = prettierFrontend;
