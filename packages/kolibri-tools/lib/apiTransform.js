const compiler = require('vue-template-compiler');
const descriptorToString = require('vue-sfc-descriptor-to-string');
const { lintSource } = require('kolibri-tools/lib/lint');
const logger = require('./logging');
const importMap = require('./moduleMapping');

const apiLogging = logger.getLogger('API Migration');

module.exports = async function (fileInfo, api) {
  const j = api.jscodeshift;
  let source = fileInfo.source;
  let parsed;
  if (fileInfo.path.endsWith('.vue')) {
    parsed = compiler.parseComponent(source);
    source = parsed.script ? parsed.script.content : '';
  }
  const root = j(source);

  // Helper function to update jest.mock calls
  function updateJestMock(path) {
    const mockArgument = path.node.arguments[0];
    if (mockArgument.type === 'Literal') {
      const oldPath = mockArgument.value;
      let newPath = oldPath;
      if (Object.prototype.hasOwnProperty.call(importMap, oldPath)) {
        if (typeof importMap[oldPath] === 'string') {
          newPath = importMap[oldPath];
        } else if (importMap[oldPath]._type === 'complex') {
          apiLogging.warn(
            `Warning: jest.mock call for '${oldPath}' found in ${path.parentPath.parentPath.value.loc.filename} - this will need to be manually updated`,
          );
        }
        if (newPath !== oldPath) {
          const newNode = j.callExpression(
            j.memberExpression(j.identifier('jest'), j.identifier('mock')),
            [j.literal(newPath), ...path.node.arguments.slice(1)],
          );
          path.replace(newNode);
        }
      } else if (oldPath.startsWith('kolibri.')) {
        // Log a warning for this jest.mock call
        apiLogging.warn(
          `Warning: jest.mock call for '${oldPath}' found in ${path.parentPath.parentPath.value.loc.filename} not found in api mapper`,
        );
      }
    }
  }

  function createImportDeclaration(specifier, newPath, importType) {
    let importSpecifier;
    if (importType === 'default') {
      importSpecifier = j.importDefaultSpecifier(j.identifier(specifier));
    } else {
      importSpecifier = j.importSpecifier(j.identifier(specifier), j.identifier(specifier));
    }
    const declaration = j.importDeclaration([importSpecifier], j.literal(newPath));
    return declaration;
  }

  root.find(j.ImportDeclaration).forEach(path => {
    const oldSource = path.node.source.value;
    if (Object.prototype.hasOwnProperty.call(importMap, oldSource)) {
      if (importMap[oldSource] === null) {
        // Log a warning for this import
        apiLogging.warn(`Warning: Removed import '${oldSource}' found in ${fileInfo.path}`);
      } else if (typeof importMap[oldSource] === 'string') {
        // Replace the import path
        path.node.source = j.literal(importMap[oldSource]);
      } else if (importMap[oldSource]._type === 'complex') {
        const specifiers = path.node.specifiers;
        const newImports = specifiers
          .map(specifier => {
            if (j.ImportSpecifier.check(specifier)) {
              const importedName = specifier.imported.name;
              let newPath;
              let importType = 'default';
              if (importMap[oldSource][importedName]) {
                newPath = importMap[oldSource][importedName];
                if (typeof newPath === 'object') {
                  newPath = newPath.path;
                  importType = 'named';
                }
              } else {
                newPath = `${importMap[oldSource]._defaultPath}/${importedName}`;
              }
              return createImportDeclaration(importedName, newPath, importType);
            }
            return null;
          })
          .filter(Boolean);

        if (newImports.length > 0) {
          path.replace(...newImports);
        }
      }
    } else if (oldSource.startsWith('kolibri.')) {
      // Log a warning for this import
      apiLogging.warn(`Warning: Import '${oldSource}' found in ${fileInfo.path} not found in api`);
    }
  });
  // Update jest.mock calls
  root
    .find(j.CallExpression, {
      callee: {
        type: 'MemberExpression',
        object: { name: 'jest' },
        property: { name: 'mock' },
      },
    })
    .forEach(updateJestMock);
  let output = root.toSource({ quote: 'single', comments: true });
  if (fileInfo.path.endsWith('.vue')) {
    if (parsed.script) {
      parsed.script.content = output;
    }
    output = descriptorToString(parsed);
  }
  const { formatted } = await lintSource({ source: output, file: fileInfo.path });
  return formatted;
};
