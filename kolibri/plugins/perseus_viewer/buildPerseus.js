const fs = require('fs');
const path = require('path');
const execSync = require('child_process').execSync;
const mkdirp = require('mkdirp');
const rimraf = require('rimraf');
const webpack = require('webpack');
const buildConfig = require('./perseusBuildConfig');
const extractPerseusMessages = require('./extractPerseusMessages');

const currentCwd = process.cwd();

const submodulesPath = path.resolve(__dirname, './submodules');

// Clear submodules, create the directory anew, cd into it, and clone the submodules
console.log('Cloning the Learning Equality Perseus repo');
rimraf.sync(submodulesPath);
mkdirp.sync(submodulesPath);
process.chdir(submodulesPath);
execSync('git clone https://github.com/learningequality/perseus.git');
console.log('Learning Equality Perseus repo successfully cloned');


// Change into the perseus directory and fetch its submodules
console.log('Fetching all perseus submodules');
process.chdir('perseus');
execSync('git submodule update --init --recursive');
console.log('All perseus submodules fetched');

// Install all the node dependencies for perseus
console.log('Installing perseus dependencies');
execSync('yarn install');
console.log('Perseus dependencies installed');

// Change back to the current directory and clear the dist folder
// for built assets.
process.chdir(__dirname);
const target = path.resolve(__dirname, './assets/dist');
console.log('Clearing dist folder');
rimraf.sync(target);
mkdirp.sync(target);


// A regex for detecting paths inside `url` in CSS, paths can either be quoted or unquoted.
const cssPathRegex = /(url\(['"]?)([^"')]+)?(['"]?\),? ?)/g;
// These are the css files that we are parsing to extract static assets from and remap them.
// This will also copy the files to the dist folder, so we can include the css in our subsequent
// build process.
const files = [
  path.resolve(__dirname, './submodules/perseus/stylesheets/local-only/khan-exercise.css'),
  path.resolve(__dirname, './submodules/perseus/lib/katex/katex.css'),
  path.resolve(__dirname, './submodules/perseus/build/perseus.css'),
  path.resolve(__dirname, './submodules/perseus/lib/mathquill/mathquill.css'),
];

const compiler = webpack(buildConfig);

console.log('Creating Perseus bundle with webpack');

const README = `The files in this directory are generated using the buildPerseus.js script inside this plugin.
They should be regenerated using the same command in the unlikely event that Perseus ever needs
to be updated.
The script is run using the following command: yarn workspace kolibri-perseus-viewer run build-perseus.
This will automatically pull the latest version of Perseus and its submodules from the Learning Equality fork,
and then copy and build relevant files from there into the static and assets/dist folders in this plugin.
This is to avoid having to run a build of Perseus every time the wrapper code for the plugin is updated.
`;


// Invoking run on the compiler triggers the webpack build.
// Everything that happens after that is subsequent to the completion of the build.
compiler.run(err => {
  if (!err) {
    console.log('Webpack build complete');
    const perseusFile = path.resolve(__dirname, './assets/dist/perseus.js');
    const webpackCommentRegex = /\/\/ (CONCATENATED|EXTERNAL) MODULE: .*?\n/g;
    const perseusContents = fs.readFileSync(perseusFile, 'utf8');
    fs.writeFileSync(perseusFile, perseusContents.replace(webpackCommentRegex, ''), { encoding: 'utf8' });
    fs.writeFileSync(path.join(target, 'README.md'), README, { encoding: 'utf-8' });
    for (let file of files) {
      console.log('Copying file and references for: ', file);
      const targetLocation = path.join(target, path.basename(file));
      if (file.endsWith('.css')) {
        const cssFileContents = fs.readFileSync(file, { encoding: 'utf-8' });
        const modifiedContents = cssFileContents.replace(cssPathRegex, function(match, p1, p2, p3) {
          // Make absolute paths relative
          const absolute = p2.startsWith('/');
          const newUrl = absolute ? p2.slice(1) : p2;
          const source = path.resolve(absolute ? path.join(__dirname, './submodules/perseus') : path.dirname(file), newUrl).split('#')[0];
          const fileTarget = path.join(target, newUrl).split('#')[0];
          mkdirp.sync(path.dirname(fileTarget));
          try {
            fs.copyFileSync(source, fileTarget);
            console.log(`Copied ${source} to ${fileTarget}`);
            if (newUrl) {
              // If so, replace the instance with the new URL.
              return `${p1}${newUrl}${p3}`;
            }
          } catch (e) {
            if (e.code === 'ENOENT') {
              console.error('File not found', source, fileTarget); // eslint-disable-line no-console
            } else {
              console.debug('Error during URL handling', e); // eslint-disable-line no-console
            }
          }
          // Otherwise just return empty string so that we remove the unfound file from the CSS.
          return '';
        });
        fs.writeFileSync(targetLocation, modifiedContents, { encoding: 'utf-8' });
      } else {
        fs.copyFileSync(file, targetLocation);
      }
    }
    // Now that the file has been built, we can extract all the perseus messages.
    extractPerseusMessages().then(() => {
      rimraf.sync(submodulesPath);
      // Write out the readme to the dist folder.
      fs.writeFileSync(path.join(target, 'README.md'), README, { encoding: 'utf-8' });
      process.chdir(currentCwd);
    });
  } else {
    // If there's an error still cleanup after ourselves.
    console.log(err);
    rimraf.sync(submodulesPath);
    process.chdir(currentCwd);
  }
});
