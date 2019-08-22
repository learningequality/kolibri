/* eslint-disable */
const fs = require('fs');
const path = require('path');
const resolve = require('resolve');
const espree = require('espree');
const escodegen = require('escodegen');
const mkdirp = require('mkdirp');
const vueTemplateCompiler = require('vue-template-compiler');
const scssParser = require('scss-parser');
const createQueryWrapper = require('query-ast');
const esquery = require('esquery');
const ensureDist = require('./ensureDist');

/**
 * The following code is designed to read our apiSpec Javascript, but without having to resolve the
 * requires contained therein, which include references to files that are not amenable to a vanilla
 * node js require - however, they are properly handled by our webpack build process.
 */

// Find the API specification file relative to this file.
const specFilePath = path.resolve(
  path.join(__dirname, '../../../kolibri/core/assets/src/core-app/apiSpec.js')
);

function specModule(filePath) {
  const rootPath = path.dirname(filePath);
  function newPath(p1) {
    if (p1.startsWith('.')) {
      return path.join(rootPath, p1);
    } else {
      return p1;
    }
  }

  // Read the spec file and do a regex replace to change all instances of 'require('...')'
  // to just be the string of the require path.
  // Our strict linting rules should ensure that this regex suffices.
  const apiSpecFile = fs.readFileSync(filePath, { encoding: 'utf-8' });

  const apiSpecTree = espree.parse(apiSpecFile, { sourceType: 'module', ecmaVersion: 2018 });

  const pathLookup = {};

  apiSpecTree.body.forEach(function(dec) {
    if (dec.type === espree.Syntax.ImportDeclaration) {
      pathLookup[dec.specifiers[0].local.name] = newPath(dec.source.value);
    }
  });

  const properties = apiSpecTree.body.find(
    dec => dec.type === espree.Syntax.ExportDefaultDeclaration
  ).declaration.properties;

  function recurseProperties(props) {
    props.forEach(prop => {
      if (prop.value.type === espree.Syntax.ObjectExpression) {
        recurseProperties(prop.value.properties);
      } else if (prop.value.type === espree.Syntax.Identifier) {
        const path = pathLookup[prop.key.name];
        (prop.value = {
          type: 'Literal',
          value: path,
          raw: '"' + path + '"',
        }),
          (prop.shorthand = false);
      }
    });
  }

  recurseProperties(properties);

  // Manually construct an AST that will contain the apiSpec object we need
  const objectTree = {
    type: 'Program',
    body: [
      {
        type: 'VariableDeclaration',
        declarations: [
          {
            type: 'VariableDeclarator',
            id: { type: 'Identifier', name: 'apiSpec' },
            init: {
              type: 'ObjectExpression',
              properties,
            },
          },
        ],
        kind: 'var',
      },
    ],
    sourceType: 'script',
  };

  eval(escodegen.generate(objectTree));

  return apiSpec;
}

let apiSpec;

const distSpecFilePath = path.resolve(__dirname, '../dist/apiSpec.json');

try {
  apiSpec = specModule(specFilePath);
} catch (e) {
  apiSpec = require(distSpecFilePath);
}

const { kolibriName } = require('./kolibriName');

function requireName(pathArray, separator = '.') {
  return ['kolibri'].concat(pathArray.slice(1)).join(separator);
}

let baseAliases = {};

const baseAliasSourcePaths = {
  kolibri_module: path.resolve(__dirname, '../../../kolibri/core/assets/src/kolibri_module'),
  kolibri_app: path.resolve(__dirname, '../../../kolibri/core/assets/src/kolibri_app'),
  content_renderer_module: path.resolve(
    __dirname,
    '../../../kolibri/core/assets/src/content_renderer_module'
  ),
  plugin_data: path.resolve(__dirname, '../../../kolibri/core/assets/src/utils/plugin_data'),
  // To clean up - once we allow for core API elements to be defined as either bundled or not bundled
  // into the default frontend code bundle, we should amalgamate all of these into the main API spec.
};

const baseAliasDistPath = path.resolve(__dirname, '../dist');

const baseAliasDistPaths = {
  kolibri_module: path.resolve(baseAliasDistPath, 'kolibri_module'),
  kolibri_app: path.resolve(baseAliasDistPath, 'kolibri_app'),
  content_renderer_module: path.resolve(baseAliasDistPath, 'content_renderer_module'),
  plugin_data: path.resolve(baseAliasDistPath, 'plugin_data'),
};

// Assume if kolibri_module is not available on the source path, then we need to use the dist
if (fs.existsSync(baseAliasSourcePaths.kolibri_module + '.js')) {
  baseAliases = baseAliasSourcePaths;
} else {
  baseAliases = baseAliasDistPaths;
}

function recurseAndCopySpecObject(specObj, targetPath) {
  const knownAliases = coreAliases();

  const distPath = targetPath;

  // Keep track of all the external dependencies so that they can be added to the package.json
  // for the exported API spec.
  const externalDependencies = {};
  const files = [];

  function parseJSDependencies(sourceContents, destinationFolder, sourceFolder) {
    const sourceTree = espree.parse(sourceContents, { sourceType: 'module', ecmaVersion: 2018 });
    const importNodes = esquery.query(
      sourceTree,
      '[type=/(ImportDeclaration|ExportNamedDeclaration|ExportAllDeclaration)/]'
    );
    importNodes.forEach(node => {
      if (node.source) {
        const importPath = node.source.value;
        // Prefix any resolved files with an underscore as they are not part of the core spec
        const replacePath = resolveDependenciesAndCopy({
          sourcePath: importPath,
          destinationFolder,
          sourceFolder,
          prefix: '_',
        });
        sourceContents = sourceContents.replace(importPath, replacePath);
      }
    });
    return sourceContents;
  }

  function parseScssDependencies(sourceContents, destinationFolder, sourceFolder) {
    const sourceTree = scssParser.parse(sourceContents);
    const scssWrapper = createQueryWrapper(sourceTree);
    const importNodes = scssWrapper('atrule')
      .has(wrapper => wrapper.node.value === 'import')
      .children('string_single').nodes;
    importNodes.forEach(node => {
      // This should be the path for the import statement
      const importPath = node.node.value;
      // Prefix any resolved files with an underscore as they are not part of the core spec
      const replacePath = resolveDependenciesAndCopy({
        sourcePath: importPath,
        destinationFolder,
        sourceFolder,
        prefix: '_',
      });
      sourceContents.replace(importPath, replacePath);
    });
    return sourceContents;
  }

  function parseVueDependencies(sourceContents, destinationFolder, sourceFolder) {
    let template = vueTemplateCompiler.parseComponent(sourceContents);
    function insertContent(source, block, newCode) {
      const start = block.start;
      const end = block.end;
      return source.replace(source.slice(start, end), newCode);
    }
    const args = [destinationFolder, sourceFolder];
    if (template.script) {
      const newJs = parseJSDependencies(template.script.content, ...args);
      sourceContents = insertContent(sourceContents, template.script, newJs);
      template = vueTemplateCompiler.parseComponent(sourceContents);
    }
    template.styles.forEach(style => {
      const newStyle = parseScssDependencies(style.content, ...args);
      sourceContents = insertContent(sourceContents, style, newStyle);
      template = vueTemplateCompiler.parseComponent(sourceContents);
    });
    return sourceContents;
  }

  function resolveDependenciesAndCopy({
    sourcePath,
    destinationFolder,
    sourceFolder = '',
    prefix = '',
    destinationFileBase = '',
  } = {}) {
    // The source file path must be an absolute or relative path, otherwise it is a library external to Kolibri
    // like vue, vuex etc. Do not copy these. Alternatively it is a kolibri API spec reference.
    // Create a path without ~ because this is used for node_module or alias import resolution in SCSS/CSS
    if (sourcePath.startsWith('/') || sourcePath.startsWith('.')) {
      const source = path.join(sourceFolder, sourcePath);
      // Find the actual source file name, as many path references do not have an extension.
      const sourceFile = resolve.sync(source, {
        extensions: ['.js', '.json', '.vue', '.scss', '.css'],
      });

      let extraPath = '';

      // Possible that the resolved file is actually an index file inside a folder
      // Check for that case.
      if (path.basename(sourceFile).startsWith('index')) {
        extraPath = path
          .dirname(sourceFile)
          .split(path.sep)
          .slice(-1)[0];
      }
      // Create the destination file name based on the source file name base name, copy it exactly.
      const destinationFile = path.join(
        destinationFolder,
        extraPath,
        prefix +
          (destinationFileBase
            ? destinationFileBase + path.extname(sourceFile)
            : path.basename(sourceFile))
      );
      // Copy from the source to the destination.
      const sourceContents = fs.readFileSync(sourceFile, { encoding: 'utf-8' });

      const extension = path.extname(sourceFile);

      let finalSource;

      const newDestFolder = path.join(destinationFolder, extraPath);

      mkdirp.sync(newDestFolder);

      const newSourceFolder = path.dirname(sourceFile);

      const args = [sourceContents, newDestFolder, newSourceFolder];

      if (extension === '.js') {
        finalSource = parseJSDependencies(...args);
      } else if (extension === '.vue') {
        finalSource = parseVueDependencies(...args);
      } else if (extension === '.scss' || extension === '.css') {
        // SCSS is a superset of CSS
        finalSource = parseScssDependencies(...args);
      } else {
        finalSource = sourceContents;
      }
      // Write out the final contents of the file to disk
      fs.writeFileSync(destinationFile, finalSource, { encoding: 'utf-8' });
      files.push(destinationFile);
      // Return a relative path to the copied file
      return './' + prefix + path.basename(sourceFile);
    } else {
      const exportSourcePath = (sourcePath.startsWith('~')
        ? sourcePath.slice(1)
        : sourcePath
      ).split('/')[0];
      if (!knownAliases[exportSourcePath] && !externalDependencies[exportSourcePath]) {
        externalDependencies[exportSourcePath] = true;
      }
    }
    // If we have not already returned, return the original sourcePath unmodified.
    return sourcePath;
  }

  function recurseSpecAndCopy(pathsArray, obj) {
    Object.keys(obj).forEach(key => {
      if (typeof obj[key] === 'object') {
        recurseSpecAndCopy([...pathsArray, key], obj[key]);
      } else {
        // Make a folder so that we have a directory structure that maps to the core API object structure
        const destinationFolder = path.resolve(path.join(distPath, ...pathsArray));
        mkdirp.sync(destinationFolder);
        resolveDependenciesAndCopy({
          sourcePath: obj[key],
          destinationFolder,
          destinationFileBase: key,
        });
      }
    });
  }
  recurseSpecAndCopy([], specObj);
  return {
    files,
    externalDependencies,
  };
}

const __builder = {
  checkSrc() {
    /*
     * Function to check that we are in the Kolibri source repo whenever doing any of these build tasks.
     */
    if (!fs.existsSync(specFilePath)) {
      throw new ReferenceError(
        'Attempting to build the API Spec from outside the Kolibri source repo'
      );
    }
  },
  buildApiSpec() {
    /*
     * Function for creating an exportable version of the API spec generated within this module
     * to allow export of the core API spec for use in external plugins.
     * Sets all paths to those created in the exported apiSpec below, so that modules that
     * need to be referenced at build time, like scss files, can be mapped if needed.
     */
    this.checkSrc();
    const specObj = {};
    function recurseObjectKeysAndMapToExportedSpec(obj, pathArray, spec) {
      const lastKey = pathArray.slice(-1)[0];
      if (typeof obj === 'object') {
        if (lastKey) {
          spec[lastKey] = {};
        }
        Object.keys(obj).forEach(function(key) {
          recurseObjectKeysAndMapToExportedSpec(
            obj[key],
            pathArray.concat(key),
            spec[lastKey] || spec
          );
        });
      } else {
        if (lastKey) {
          // Check if this is a global import (i.e. from node_modules)
          if (!obj.startsWith('/')) {
            spec[lastKey] = obj;
          } else {
            // Add any file extension from the original spec
            spec[lastKey] = requireName(['kolibri'].concat(pathArray), '/') + path.extname(obj);
          }
        }
      }
    }
    recurseObjectKeysAndMapToExportedSpec(apiSpec, [], specObj);
    ensureDist();
    fs.writeFileSync(distSpecFilePath, JSON.stringify(specObj, undefined, 2), {
      encoding: 'utf-8',
    });
    recurseAndCopySpecObject(baseAliasSourcePaths, baseAliasDistPath);
  },
  exportApiSpec(distPath) {
    /*
     * Function for creating an exported copy of the API spec and all associated modules
     * to allow building of frontend plugins that need to import files that cannot be referenced
     * in the frontend, e.g. scss files (required during build time) or for standalone apps that
     * wish to use our component library but do not want to import the entire kolibriCoreAppGlobal object.
     */
    this.checkSrc();

    const { files, externalDependencies } = recurseAndCopySpecObject(apiSpec, distPath);
    return {
      dependencies: Object.keys(externalDependencies),
      files,
    };
  },
};

function coreExternals() {
  /*
   * Function for creating a hash of externals for modules that are exposed on the core kolibri object.
   */
  const externalsObj = {
    kolibri: kolibriName,
  };
  function recurseObjectKeysAndExternalize(obj, pathArray) {
    if (typeof obj === 'object') {
      Object.keys(obj).forEach(function(key) {
        recurseObjectKeysAndExternalize(obj[key], pathArray.concat(key));
      });
    } else {
      // Check if this is a global import (i.e. from node_modules)
      if (!obj.startsWith('.')) {
        externalsObj[obj] = pathArray.join('.');
      }
      externalsObj[requireName(pathArray)] = pathArray.join('.');
    }
  }
  recurseObjectKeysAndExternalize(apiSpec, [kolibriName]);
  return externalsObj;
}

function coreAliases() {
  /*
   * Function for creating a hash of aliases for modules that are exposed on the core kolibri object.
   */
  const aliasesObj = Object.assign({}, baseAliases);
  function recurseObjectKeysAndAlias(obj, pathArray) {
    if (typeof obj === 'object') {
      Object.keys(obj).forEach(function(key) {
        recurseObjectKeysAndAlias(obj[key], pathArray.concat(key));
      });
    } else {
      // By checking path.length is greater than 1, we ignore 'module' in
      // the top namespace, as, logically, that would overwrite the global object.
      // We only want to include modules that are using relative imports, so as to exclude
      // modules that are already in node_modules.
      if (obj.startsWith('.')) {
        // Map from the requireName to a resolved path (relative to the apiSpecFile) to the module in question.
        aliasesObj[requireName(pathArray)] = path.resolve(
          path.join(path.dirname(specFilePath), obj)
        );
      } else if (!obj.startsWith('.')) {
        aliasesObj[requireName(pathArray)] = obj;
      }
    }
  }
  recurseObjectKeysAndAlias(apiSpec, ['kolibri']);
  return aliasesObj;
}

module.exports = {
  coreExternals,
  coreAliases,
  baseAliases,
  __builder,
};
