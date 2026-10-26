#!/usr/bin/env node
const { Command } = require('commander');
const Minimatch = require('minimatch').Minimatch;
const glob = require('kolibri-glob');
const {
  assertOnePostcss,
  errorOrChange,
  logging,
  lint,
  noChange,
  usesPostcssHtml,
} = require('./index');

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
      const matches = files
        .flatMap(file => glob.sync(file, { ignore }))
        .filter(globbedFile => !patternCheck || patternCheck.match(globbedFile));
      let lintable = matches;
      let initialCode = noChange;
      try {
        if (matches.some(usesPostcssHtml)) {
          assertOnePostcss();
        }
      } catch (error) {
        logging.error(error.message);
        lintable = matches.filter(file => !usesPostcssHtml(file));
        initialCode = errorOrChange;
      }
      Promise.all(
        lintable.map(globbedFile =>
          lint({ file: globbedFile, write }).catch(error => {
            logging.error(`Error processing file: ${globbedFile}`);
            logging.error(error.error ? error.error : error);
            return typeof error.code === 'number' ? error.code : 1;
          }),
        ),
      ).then(sources => {
        logging.info(`Linted ${lintable.length} file${lintable.length !== 1 ? 's' : ''}`);
        process.exit(
          sources.reduce((code, result) => {
            return Math.max(code, result);
          }, initialCode),
        );
      });
    }
  });

program.parse(process.argv);
