const prettier = require('prettier');
const compiler = require('vue-template-compiler');
const fs = require('fs');
const path = require('path');

const errorOrChange = 1;
const noChange = 0;

function prettierFrontend({ file, write, encoding = 'utf-8', prettierOptions }) {
  return new Promise((resolve, reject) => {
    fs.readFile(file, { encoding }, (err, buffer) => {
      if (err) {
        reject({ message: err.message, code: errorOrChange });
        return;
      }
      const source = buffer.toString();
      const vueComponent = compiler.parseComponent(source);
      let formatted;
      const options = Object.assign(
        {
          filepath: file,
        },
        prettierOptions
      );
      try {
        // Raw JS file, so assume is raw javascript to format.
        if (file.endsWith('.js')) {
          formatted = prettier.format(source, options);
        } else if (vueComponent && vueComponent.script) {
          const start = vueComponent.script.start;
          const end = vueComponent.script.end;
          const code = source.slice(start, end).replace(/(\n)  /g, '$1');
          let formattedJs = prettier.format(code, options);
          // Ensure that the beginning and end of the JS has two newlines to fit our
          // Component linting conventions
          // Ensure it is indented by two spaces
          formattedJs = formattedJs.replace(/^(\n)*/, '\n\n');
          formattedJs = formattedJs.replace(/(\n)*$/, '\n\n');
          formattedJs = formattedJs.replace(/(.*\S.*)/g, '  $1');
          // Return reformatted Vue component, by replacing existing JS in component
          // with the linted code.
          formatted = source.replace(source.slice(start, end), formattedJs);
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
  const defaultGlobPattern = './{kolibri/**/assets,frontend_build,karma_config}/**/*.{js,vue}';

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
