var fs = require('fs');
var path = require('path');
var esprima = require('esprima');
var escodegen = require('escodegen');

/**
 * The following code is designed to read our apiSpec Javascript, but without having to resolve the
 * requires contained therein, which include references to files that are not amenable to a vanilla
 * node js require - however, they are properly handled by our webpack build process.
 */

// Find the API specification file relative to this file.
var specFilePath = path.resolve(
  path.join(__dirname, '../../kolibri/core/assets/src/core-app/apiSpec.js')
);

function specModule(filePath) {
  const rootPath = path.dirname(filePath);
  function newPath(importPath) {
    if (importPath.startsWith('.')) {
      return path.join(rootPath, importPath);
    } else {
      return importPath;
    }
  }

  // Read the spec file and do a regex replace to change all instances of 'import...'
  // to just be the string of the import path.
  // Our strict linting rules should ensure that this regex suffices.
  const apiSpecFile = fs.readFileSync(filePath, { encoding: 'utf-8' });
  const apiSpecTree = esprima.parse(apiSpecFile, { sourceType: 'module' });

  const importPaths = apiSpecTree.body
    .filter(decl => decl.type === esprima.Syntax.ImportDeclaration)
    .map(importDecl => ({
      [importDecl.specifiers[0].local.name]: newPath(importDecl.source.value),
    }));

  const pathLookup = Object.assign({}, ...importPaths);

  const exportTree = apiSpecTree.body.find(
    dec => dec.type === esprima.Syntax.ExportDefaultDeclaration
  ).declaration.properties;

  function recurseProperties(props) {
    props.forEach(prop => {
      if (prop.value.type === esprima.Syntax.ObjectExpression) {
        recurseProperties(prop.value.properties);
      } else if (prop.value.type === esprima.Syntax.Identifier) {
        var path = pathLookup[prop.key.name];
        Object.assign(prop, {
          value: {
            type: 'Literal',
            value: path,
            raw: `"${path}"`,
          },
          shorthand: false,
        });
      }
    });
  }

  recurseProperties(exportTree);

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
              properties: exportTree,
            },
          },
        ],
        kind: 'var',
      },
    ],
    sourceType: 'script',
  };

  eval(escodegen.generate(objectTree));
  // apiSpec was created by the eval above
  return apiSpec;
}

var apiSpec = specModule(specFilePath);

function requireName(pathArray) {
  return ['kolibri'].concat(pathArray.slice(1)).join('.');
}

var baseAliases = {
  kolibri_module: path.resolve(__dirname, '../../kolibri/core/assets/src/kolibri_module'),
  kolibri_app: path.resolve(__dirname, '../../kolibri/core/assets/src/kolibri_app'),
  content_renderer_module: path.resolve(
    __dirname,
    '../../kolibri/core/assets/src/content_renderer_module'
  ),
};

function coreExternals(kolibri_name) {
  /*
   * Function for creating a hash of externals for modules that are exposed
   * on the core kolibri object.
   */
  var externalsObj = {
    kolibri: kolibri_name,
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
  recurseObjectKeysAndExternalize(apiSpec, [kolibri_name]);
  return externalsObj;
}

function coreAliases(localAPISpec) {
  /*
   * Function for creating a hash of aliases for modules that are exposed on
   * the core kolibri object.
   */
  var aliasesObj = Object.assign({}, baseAliases);
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
        // Map from the requireName to a resolved path (relative to the apiSpecFile)
        // to the module in question.
        aliasesObj[requireName(pathArray)] = path.resolve(
          path.join(path.dirname(specFilePath), obj)
        );
      } else if (!obj.startsWith('.')) {
        aliasesObj[requireName(pathArray)] = obj;
      }
    }
  }
  recurseObjectKeysAndAlias(apiSpec, ['kolibri']);
  if (localAPISpec) {
    // If there is a local API spec being injected, just overwrite previous aliases.
    var localSpec = specModule(localAPISpec);
    recurseObjectKeysAndAlias(localSpec, ['kolibri']);
  }
  return aliasesObj;
}

module.exports = {
  coreExternals: coreExternals,
  coreAliases: coreAliases,
  baseAliases: baseAliases,
};
