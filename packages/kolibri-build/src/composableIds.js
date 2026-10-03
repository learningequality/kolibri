const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const acorn = require('acorn');
const walk = require('acorn-walk');
const MagicString = require('magic-string');

const GLOBAL_STORE = 'kolibri/composables/GlobalStore';

const packageRoots = new Map();

function findPackage(directory) {
  if (!packageRoots.has(directory)) {
    const manifest = path.join(directory, 'package.json');
    const parent = path.dirname(directory);
    let found = null;
    if (fs.existsSync(manifest)) {
      const { name } = JSON.parse(fs.readFileSync(manifest, 'utf8'));
      found = name ? { name, root: directory } : null;
    }
    if (!found && parent !== directory) {
      found = findPackage(parent);
    }
    packageRoots.set(directory, found);
  }
  return packageRoots.get(directory);
}

function modulePath(resourcePath) {
  const pkg = findPackage(path.dirname(resourcePath));
  if (!pkg) {
    return resourcePath.split(path.sep).join('/');
  }
  const relative = path.relative(pkg.root, resourcePath).split(path.sep).join('/');
  return `${pkg.name}/${relative}`;
}

function className(node, ancestors) {
  if (node.id) {
    return node.id.name;
  }
  const parent = ancestors[ancestors.length - 2];
  if (parent && parent.type === 'VariableDeclarator' && parent.id.type === 'Identifier') {
    return parent.id.name;
  }
  return '';
}

function importedModule(source, resourcePath) {
  const specifier = source.replace(/\.js$/, '');
  return specifier.startsWith('.')
    ? modulePath(path.resolve(path.dirname(resourcePath), specifier))
    : specifier;
}

function storeBindings(ast, resourcePath) {
  const bindings = new Set();
  for (const node of ast.body) {
    if (
      node.type === 'ImportDeclaration' &&
      importedModule(node.source.value, resourcePath) === GLOBAL_STORE
    ) {
      for (const specifier of node.specifiers) {
        if (specifier.type === 'ImportDefaultSpecifier') {
          bindings.add(specifier.local.name);
        }
      }
    }
  }
  return bindings;
}

function subclassesOf(ast, bindings) {
  const subclasses = [];
  const visit = (node, ancestors) => {
    if (
      node.superClass &&
      node.superClass.type === 'Identifier' &&
      bindings.has(node.superClass.name)
    ) {
      subclasses.push({ node, name: className(node, ancestors) });
    }
  };
  walk.ancestor(ast, { ClassDeclaration: visit, ClassExpression: visit });
  return subclasses.sort((a, b) => a.node.start - b.node.start);
}

function parse(source) {
  try {
    return acorn.parse(source, { ecmaVersion: 'latest', sourceType: 'module' });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return null;
    }
    throw error;
  }
}

function findStoreClasses(source, resourcePath) {
  if (!source.includes('GlobalStore')) {
    return [];
  }
  const ast = parse(source);
  return ast ? subclassesOf(ast, storeBindings(ast, resourcePath)) : [];
}

function discriminators(stores) {
  const nameCounts = {};
  for (const { name } of stores) {
    nameCounts[name] = (nameCounts[name] || 0) + 1;
  }
  return stores.map(({ name }, index) =>
    name && nameCounts[name] === 1 ? name : `${name}~${index}`,
  );
}

function composableId(prefix, discriminator, production) {
  const developmentId = `${prefix}#${discriminator}`;
  return production
    ? createHash('sha256').update(developmentId).digest('base64url').slice(0, 6)
    : developmentId;
}

function stampComposableIds(source, resourcePath, { production = false } = {}) {
  const stores = findStoreClasses(source, resourcePath);
  if (!stores.length) {
    return null;
  }
  const prefix = modulePath(resourcePath);
  const magic = new MagicString(source);
  discriminators(stores).forEach((discriminator, index) => {
    const id = composableId(prefix, discriminator, production);
    magic.appendLeft(
      stores[index].node.body.start + 1,
      ` static [Symbol.for('kolibri.composableId')] = ${JSON.stringify(id)};`,
    );
  });
  return {
    code: magic.toString(),
    map: magic.generateMap({ hires: true, source: resourcePath, includeContent: true }),
  };
}

module.exports = { stampComposableIds };
