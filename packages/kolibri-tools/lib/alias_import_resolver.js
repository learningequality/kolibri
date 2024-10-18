var path = require('node:path');
var resolve = require('resolve');

function packageFilter(pkg) {
  if (pkg['jsnext:main']) {
    pkg['main'] = pkg['jsnext:main'];
  }
  return pkg;
}

function opts(file, config) {
  return Object.assign(
    {
      // more closely matches Node (#333)
      extensions: ['.js', '.json'],
    },
    config,
    {
      // path.resolve will handle paths relative to CWD
      basedir: path.dirname(path.resolve(file)),
      packageFilter: packageFilter,
    },
  );
}

function nodeResolver(source, file, config) {
  if (resolve.isCore(source)) {
    return { found: true, path: null };
  }
  try {
    return { found: true, path: resolve.sync(source, opts(file, config)) };
  } catch (err) {
    return { found: false };
  }
}

const moduleAliases = {};

exports.addAliases = function (aliases) {
  Object.assign(moduleAliases, aliases);
};

exports.resetAliases = function () {
  for (const key in moduleAliases) {
    delete moduleAliases[key];
  }
};

exports.interfaceVersion = 2;

exports.resolve = function (source, file, config) {
  // strip loaders
  var finalBang = source.lastIndexOf('!');
  if (finalBang >= 0) {
    source = source.slice(finalBang + 1);
  }

  // strip resource query
  var finalQuestionMark = source.lastIndexOf('?');
  if (finalQuestionMark >= 0) {
    source = source.slice(0, finalQuestionMark);
  }

  const alias = Object.keys(moduleAliases).find(k => source.startsWith(k));
  if (alias) {
    source = source.replace(alias, moduleAliases[alias]);
  }

  return nodeResolver(source, file, config);
};
