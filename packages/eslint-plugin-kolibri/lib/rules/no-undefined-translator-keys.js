/**
 * @file Disallow destructuring undefined keys from createTranslator objects.
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const espree = require('espree');

// Cache for parsed translator definitions to avoid re-parsing files
// Map: filePath -> Map<exportName, Set<keys>>
const translatorCache = new Map();

/**
 * Checks if a node is a call to createTranslator.
 * @param {object} node - AST node to check.
 * @returns {boolean} True if the node is a createTranslator call.
 */
function isCreateTranslatorCall(node) {
  return (
    node.type === 'CallExpression' &&
    node.callee.type === 'Identifier' &&
    node.callee.name === 'createTranslator' &&
    node.arguments.length >= 2
  );
}

/**
 * Extracts message keys from a createTranslator call's second argument.
 * @param {object} node - AST CallExpression node.
 * @returns {Set<string>|null} Set of message keys or null if extraction fails.
 */
function extractMessageKeys(node) {
  if (!isCreateTranslatorCall(node)) {
    return null;
  }

  const messagesArg = node.arguments[1];
  if (messagesArg.type !== 'ObjectExpression') {
    return null;
  }

  const keys = new Set();
  messagesArg.properties.forEach(prop => {
    if (prop.type === 'Property' && prop.key.type === 'Identifier') {
      keys.add(prop.key.name);
    } else if (prop.type === 'Property' && prop.key.type === 'Literal') {
      keys.add(prop.key.value);
    }
  });

  return keys;
}

/**
 * Gets the variable name that a createTranslator call is assigned to.
 * @param {object} node - AST CallExpression node.
 * @returns {string|null} Variable name or null.
 */
function getVariableName(node) {
  // Handle: const translator = createTranslator(...)
  if (node.parent.type === 'VariableDeclarator' && node.parent.id.type === 'Identifier') {
    return node.parent.id.name;
  }
  return null;
}

/**
 * Gets the object variable name and property name for a createTranslator in an object.
 * @param {object} node - AST CallExpression node.
 * @returns {{objectName: string, propertyName: string}|null} Object/property name pair or null.
 */
function getObjectPropertyInfo(node) {
  // Handle: const obj = { prop: createTranslator(...) }
  if (
    node.parent.type === 'Property' &&
    node.parent.value === node &&
    node.parent.key.type === 'Identifier' &&
    node.parent.parent.type === 'ObjectExpression' &&
    node.parent.parent.parent.type === 'VariableDeclarator' &&
    node.parent.parent.parent.id.type === 'Identifier'
  ) {
    return {
      objectName: node.parent.parent.parent.id.name,
      propertyName: node.parent.key.name,
    };
  }
  return null;
}

/**
 * Gets the variable name that a createTranslator call is exported as.
 * @param {object} node - AST CallExpression node.
 * @returns {string|null} Export name or null.
 */
function getExportName(node) {
  // Handle: export const translator = createTranslator(...)
  if (
    node.parent.type === 'VariableDeclarator' &&
    node.parent.id.type === 'Identifier' &&
    node.parent.parent.type === 'VariableDeclaration' &&
    node.parent.parent.parent.type === 'ExportNamedDeclaration'
  ) {
    return node.parent.id.name;
  }
  return null;
}

/**
 * Gets the source variable name from a destructuring assignment.
 * @param {object} node - AST node (the init part of VariableDeclarator).
 * @returns {string|null} Source variable name or null.
 */
function getSourceVariableName(node) {
  if (node.type === 'Identifier') {
    return node.name;
  }
  return null;
}

/**
 * Gets member expression information for destructuring from object.property.
 * @param {object} node - AST node (the init part of VariableDeclarator).
 * @returns {{objectName: string, propertyName: string}|null} Object/property name pair or null.
 */
function getMemberExpressionInfo(node) {
  // Handle: const { key$ } = obj.prop
  if (
    node.type === 'MemberExpression' &&
    node.object.type === 'Identifier' &&
    node.property.type === 'Identifier' &&
    !node.computed
  ) {
    return {
      objectName: node.object.name,
      propertyName: node.property.name,
    };
  }
  return null;
}

/**
 * Checks if a file path exists and is a file.
 * @param {string} filePath - Path to check.
 * @returns {boolean} True if the path exists and is a file.
 */
function isFile(filePath) {
  try {
    return fs.existsSync(filePath) && fs.statSync(filePath).isFile();
  } catch {
    return false;
  }
}

/**
 * Tries to resolve a path with various extensions.
 * @param {string} basePath - Base path to try.
 * @param {Array<string>} extensions - Extensions to try.
 * @returns {string|null} Resolved path or null.
 */
function tryResolveWithExtensions(basePath, extensions) {
  // Try without extension first
  if (isFile(basePath)) {
    return basePath;
  }

  // Try with each extension
  for (const ext of extensions) {
    const withExt = basePath + ext;
    if (isFile(withExt)) {
      return withExt;
    }
  }

  return null;
}

/**
 * Resolves an import path to an absolute file path using Node.js resolution.
 * @param {string} importPath - The import path (e.g., './strings' or 'kolibri/utils/i18n').
 * @param {string} currentFile - The absolute path of the current file.
 * @returns {string|null} Absolute path to the imported file or null if not found.
 */
function resolveImportPath(importPath, currentFile) {
  const currentDir = path.dirname(currentFile);
  const extensions = ['.js', '.ts', '.jsx', '.tsx'];

  // Handle relative imports (./file or ../file)
  if (importPath.startsWith('.')) {
    const basePath = path.resolve(currentDir, importPath);
    return tryResolveWithExtensions(basePath, extensions);
  }

  // For absolute imports, use Node.js module resolution
  try {
    return require.resolve(importPath, { paths: [currentDir] });
  } catch {
    // Module not found - return null and skip validation
    return null;
  }
}

/**
 * Walks an AST to find all createTranslator exports and declarations.
 * @param {object} ast - Parsed AST.
 * @returns {Map<string, Set<string>>} Map of export name to Set of message keys.
 */
function findTranslatorsInAST(ast) {
  const translators = new Map();
  const localTranslators = new Map(); // Track non-exported translators for re-export pattern

  function walk(node) {
    if (!node || typeof node !== 'object') {
      return;
    }

    // Pattern 1: export const name = createTranslator(...)
    if (
      node.type === 'ExportNamedDeclaration' &&
      node.declaration &&
      node.declaration.type === 'VariableDeclaration'
    ) {
      node.declaration.declarations.forEach(declarator => {
        if (
          declarator.type === 'VariableDeclarator' &&
          declarator.id.type === 'Identifier' &&
          declarator.init &&
          isCreateTranslatorCall(declarator.init)
        ) {
          const exportName = declarator.id.name;
          const keys = extractMessageKeys(declarator.init);
          if (keys) {
            translators.set(exportName, keys);
          }
        }
      });
    }

    // Pattern 2: export default createTranslator(...)
    if (
      node.type === 'ExportDefaultDeclaration' &&
      node.declaration &&
      isCreateTranslatorCall(node.declaration)
    ) {
      const keys = extractMessageKeys(node.declaration);
      if (keys) {
        translators.set('default', keys);
      }
    }

    // Pattern 3: const name = createTranslator(...) (for later re-export)
    // We track ALL variable declarations; Pattern 1 will override if it's an export
    if (node.type === 'VariableDeclaration') {
      node.declarations.forEach(declarator => {
        if (
          declarator.type === 'VariableDeclarator' &&
          declarator.id.type === 'Identifier' &&
          declarator.init &&
          isCreateTranslatorCall(declarator.init)
        ) {
          const name = declarator.id.name;
          const keys = extractMessageKeys(declarator.init);
          if (keys) {
            // Only add to localTranslators if not already in translators
            // (Pattern 1 would have added it to translators already)
            if (!translators.has(name)) {
              localTranslators.set(name, keys);
            }
          }
        }
      });
    }

    // Pattern 4: export { name } (re-export pattern)
    if (node.type === 'ExportNamedDeclaration' && !node.declaration && node.specifiers) {
      node.specifiers.forEach(spec => {
        if (spec.type === 'ExportSpecifier') {
          const localName = spec.local.name;
          const exportedName = spec.exported.name;
          if (localTranslators.has(localName)) {
            translators.set(exportedName, localTranslators.get(localName));
          }
        }
      });
    }

    // Walk child nodes
    for (const key in node) {
      if (node[key] && typeof node[key] === 'object') {
        if (Array.isArray(node[key])) {
          node[key].forEach(child => walk(child));
        } else {
          walk(node[key]);
        }
      }
    }
  }

  walk(ast);
  return translators;
}

/**
 * Parses a file and extracts translator keys for a specific export.
 * @param {string} filePath - Absolute path to the file.
 * @param {string} exportedName - The export identifier to look up in the file.
 * @returns {Set<string>|null} The translator's message keys, or null when parsing fails.
 */
function getTranslatorKeysFromFile(filePath, exportedName) {
  try {
    if (!fs.existsSync(filePath)) {
      return null;
    }

    // Check cache first
    if (translatorCache.has(filePath)) {
      const fileCache = translatorCache.get(filePath);
      return fileCache.get(exportedName) || null;
    }

    // Read and parse file
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const ast = espree.parse(fileContent, {
      ecmaVersion: 2020,
      sourceType: 'module',
    });

    // Find all translators in the file
    const translators = findTranslatorsInAST(ast);

    // Cache the results
    translatorCache.set(filePath, translators);

    // Return the requested translator's keys
    return translators.get(exportedName) || null;
  } catch (error) {
    // If we can't read or parse the file, return null
    // This is acceptable - we simply skip validation for imports we can't resolve
    return null;
  }
}

/**
 * Validates destructuring against defined translator keys.
 * @param {object} node - AST VariableDeclarator node.
 * @param {object} translatorInfo - Object with keys: Set<string>.
 * @param {object} context - ESLint context.
 * @param {string} translatorName - Name of the translator variable.
 * @returns {void}
 */
function validateDestructuring(node, translatorInfo, context, translatorName) {
  const { keys } = translatorInfo;

  if (node.id.type !== 'ObjectPattern') {
    return;
  }

  node.id.properties.forEach(prop => {
    // Skip spread elements
    if (prop.type === 'RestElement') {
      return;
    }

    // Get the property name
    let propertyName;
    if (prop.key.type === 'Identifier') {
      propertyName = prop.key.name;
    } else if (prop.key.type === 'Literal') {
      propertyName = prop.key.value;
    } else {
      // Skip computed properties
      return;
    }

    // Check if property ends with $
    if (!propertyName.endsWith('$')) {
      // Report error for missing $ suffix
      context.report({
        node: prop,
        messageId: 'missingSuffix',
        data: {
          property: propertyName,
          translatorName: translatorName,
        },
      });
      return;
    }

    // Strip the $ suffix to get the message key
    const messageKey = propertyName.slice(0, -1);

    // Check if the key exists in the translator
    if (!keys.has(messageKey)) {
      const availableKeys = Array.from(keys)
        .sort()
        .map(k => `${k}$`)
        .join(', ');
      context.report({
        node: prop,
        messageId: 'undefinedTranslatorKey',
        data: {
          property: propertyName,
          translatorName: translatorName,
          availableKeys: availableKeys,
        },
      });
    }
  });
}

const create = context => {
  // Map of local translators: variableName -> { keys: Set<string> }
  const localTranslators = new Map();

  // Map of imported translators: localName -> { keys: Set<string> }
  const importedTranslators = new Map();

  // Map of objects containing translators: objectName -> Map<propertyName, { keys: Set<string> }>
  const objectsWithTranslators = new Map();

  // Map of member references: variableName -> { keys: Set<string> }
  // Tracks variables that hold references to translator properties
  const memberReferences = new Map();

  return {
    // Track createTranslator calls in this file
    CallExpression(node) {
      if (!isCreateTranslatorCall(node)) {
        return;
      }

      const keys = extractMessageKeys(node);
      if (!keys) {
        return;
      }

      // Check if this is inside an object property
      const objInfo = getObjectPropertyInfo(node);
      if (objInfo) {
        // Track object with translator property
        if (!objectsWithTranslators.has(objInfo.objectName)) {
          objectsWithTranslators.set(objInfo.objectName, new Map());
        }
        objectsWithTranslators.get(objInfo.objectName).set(objInfo.propertyName, { keys });
        return;
      }

      // Get export name first (takes precedence), then variable name
      const exportName = getExportName(node);
      const varName = getVariableName(node);
      const name = exportName || varName;

      if (name) {
        localTranslators.set(name, { keys });
      }
    },

    // Track imports of translator objects
    ImportDeclaration(node) {
      const importPath = node.source.value;
      const currentFile = context.getFilename();

      node.specifiers.forEach(spec => {
        if (spec.type === 'ImportSpecifier') {
          const importedName = spec.imported.name;
          const localName = spec.local.name;

          // Resolve the import path
          const resolvedPath = resolveImportPath(importPath, currentFile);
          if (!resolvedPath) {
            // Can't resolve - skip validation for this import
            return;
          }

          // Get translator keys from the imported file
          const keys = getTranslatorKeysFromFile(resolvedPath, importedName);
          if (keys) {
            importedTranslators.set(localName, { keys });
          }
        } else if (spec.type === 'ImportDefaultSpecifier') {
          // Handle default imports: import translator from './strings'
          const localName = spec.local.name;

          // Resolve the import path
          const resolvedPath = resolveImportPath(importPath, currentFile);
          if (!resolvedPath) {
            return;
          }

          // Get keys for default export
          const keys = getTranslatorKeysFromFile(resolvedPath, 'default');
          if (keys) {
            importedTranslators.set(localName, { keys });
          }
        }
      });
    },

    // Validate destructuring
    VariableDeclarator(node) {
      if (node.id.type !== 'ObjectPattern' || !node.init) {
        return;
      }

      // Try to get member expression info (e.g., obj.prop)
      const memberInfo = getMemberExpressionInfo(node.init);
      if (memberInfo) {
        // Handle: const { key$ } = obj.prop
        if (objectsWithTranslators.has(memberInfo.objectName)) {
          const translatorProps = objectsWithTranslators.get(memberInfo.objectName);
          if (translatorProps.has(memberInfo.propertyName)) {
            const translatorInfo = translatorProps.get(memberInfo.propertyName);
            validateDestructuring(
              node,
              translatorInfo,
              context,
              `${memberInfo.objectName}.${memberInfo.propertyName}`,
            );
            return;
          }
        }
        // If it's not tracked, might be from an object property reference
        // e.g., const { prop } = obj; const { key$ } = prop;
        if (memberReferences.has(memberInfo.objectName)) {
          const refInfo = memberReferences.get(memberInfo.objectName);
          if (refInfo.has(memberInfo.propertyName)) {
            const translatorInfo = refInfo.get(memberInfo.propertyName);
            validateDestructuring(
              node,
              translatorInfo,
              context,
              `${memberInfo.objectName}.${memberInfo.propertyName}`,
            );
            return;
          }
        }
        return;
      }

      const sourceName = getSourceVariableName(node.init);
      if (!sourceName) {
        return;
      }

      // Check if destructuring from a local translator
      if (localTranslators.has(sourceName)) {
        validateDestructuring(node, localTranslators.get(sourceName), context, sourceName);
        return;
      }

      // Check if destructuring from an imported translator
      if (importedTranslators.has(sourceName)) {
        validateDestructuring(node, importedTranslators.get(sourceName), context, sourceName);
        return;
      }

      // Check if destructuring from a member reference
      if (memberReferences.has(sourceName)) {
        // This is a reference to a translator property, validate it
        const refInfo = memberReferences.get(sourceName);
        validateDestructuring(node, refInfo, context, sourceName);
        return;
      }

      // Check if destructuring properties from an object with translators
      // e.g., const { completed } = obj where obj.completed is a translator
      if (objectsWithTranslators.has(sourceName)) {
        // Track the extracted properties as member references
        const translatorProps = objectsWithTranslators.get(sourceName);
        node.id.properties.forEach(prop => {
          if (prop.type === 'Property' && prop.key.type === 'Identifier') {
            const propName = prop.key.name;
            const localName = prop.value.type === 'Identifier' ? prop.value.name : prop.key.name;

            if (translatorProps.has(propName)) {
              // Store this as a member reference for future destructuring
              memberReferences.set(localName, translatorProps.get(propName));
            }
          }
        });
      }
    },
  };
};

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow destructuring undefined keys from createTranslator objects',
      category: 'Possible Errors',
      recommended: true,
    },
    schema: [],
    messages: {
      undefinedTranslatorKey:
        "Destructured property '{{property}}' does not exist in translator '{{translatorName}}'. Available keys: {{availableKeys}}",
      missingSuffix:
        "Destructured property '{{property}}' from translator '{{translatorName}}' should end with '$'. Did you mean '{{property}}$'?",
    },
  },
  create,
};
