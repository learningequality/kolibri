#!/usr/bin/env node
const { Command } = require('commander');
const Minimatch = require('minimatch').Minimatch;
const glob = require('./glob');
const { logging, lint, noChange } = require('./index');

const program = new Command();

program
  .arguments('[files...]', 'List of custom file globs or file names to lint')
  .description('Run linting on files or files matching glob patterns')
  .option('-w, --write', 'Write autofixes to file', false)
  .option('-e, --encoding <string>', 'Text encoding of file', 'utf-8')
  .option('-i, --ignore <string...>', 'Ignore these comma separated patterns', [
    '**/node_modules/**',
    '**/static/**',
  ])
  .option('-p, --pattern <string>', 'Lint only files that match this glob pattern', null)
  .action(function (files, options) {
    let patternCheck;
    if (!files.length && !options.pattern) {
      logging.error('Must specify files or glob patterns to lint!');
      process.exit(1);
    } else if (!files.length) {
      files.push(options.pattern);
    } else if (options.pattern) {
      patternCheck = new Minimatch(options.pattern, {});
    }
    const ignore = options.ignore;
    const write = options.write;

    if (!files.length) {
      program.help();
    } else {
      let totalFiles = 0;
      Promise.all(
        files.map(file => {
          const matches = glob.sync(file, {
            ignore,
          });
          return Promise.all(
            matches.map(globbedFile => {
              if (!patternCheck || patternCheck.match(globbedFile)) {
                totalFiles += 1;
                return lint({ file: globbedFile, write }).catch(error => {
                  logging.error(`Error processing file: ${globbedFile}`);
                  logging.error(error.error ? error.error : error);
                  return error.code;
                });
              } else {
                return Promise.resolve(0);
              }
            }),
          ).then(sources => {
            return sources.reduce((code, result) => {
              return Math.max(code, result);
            }, noChange);
          });
        }),
      ).then(sources => {
        logging.info(`Linted ${totalFiles} file${totalFiles !== 1 ? 's' : ''}`);
        process.exit(
          sources.reduce((code, result) => {
            return Math.max(code, result);
          }, noChange),
        );
      });
    }
  });

program.parse(process.argv);
