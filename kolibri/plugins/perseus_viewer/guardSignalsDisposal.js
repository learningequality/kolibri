const { readFileSync } = require('node:fs');
const { parse } = require('acorn');
const { sources } = require('webpack');

function isDisposalAssignment(node) {
  const target = node.left;
  return (
    node.type === 'AssignmentExpression' &&
    node.operator === '=' &&
    target.type === 'MemberExpression' &&
    target.computed &&
    target.property.type === 'MemberExpression' &&
    !target.property.computed &&
    target.property.object.name === 'Symbol' &&
    target.property.property.name === 'dispose'
  );
}

function collectInsertions(node, insertions, resultUsed = true) {
  if (isDisposalAssignment(node)) {
    if (resultUsed) throw new Error('Cannot guard a Symbol.dispose assignment whose result is used');
    insertions.push([node.start, '(typeof Symbol.dispose==="symbol"&&('], [node.end, '))']);
  }
  for (const value of Object.values(node)) {
    for (const child of Array.isArray(value) ? value : [value]) {
      if (child?.type) {
        const childResultUsed =
          node.type !== 'ExpressionStatement' &&
          (node.type !== 'SequenceExpression' ||
            (resultUsed && child === node.expressions.at(-1)));
        collectInsertions(child, insertions, childResultUsed);
      }
    }
  }
}

function readSidecar(loader) {
  const mapPath = `${loader.resourcePath}.map`;
  try {
    const text = readFileSync(mapPath, 'utf8');
    loader.addDependency(mapPath);
    const map = JSON.parse(text);
    if (
      map?.version === 3 &&
      typeof map.mappings === 'string' &&
      Array.isArray(map.sources) &&
      Array.isArray(map.names)
    ) {
      return map;
    }
  } catch (error) {
    if (error.code === 'ENOENT') loader.addMissingDependency(mapPath);
    else if (!(error instanceof SyntaxError)) throw error;
  }
  return null;
}

function replaceSource(original, insertions) {
  const guarded = new sources.ReplaceSource(original);
  for (const [offset, text] of insertions) guarded.insert(offset, text);
  return guarded;
}

module.exports = function (source, inputMap) {
  const insertions = [];
  collectInsertions(parse(source, { ecmaVersion: 'latest', sourceType: 'module' }), insertions);

  const sidecar =
    this?.sourceMap &&
    !inputMap &&
    source.trimEnd().endsWith('//# sourceMappingURL=signals-core.module.js.map') &&
    readSidecar(this);

  const resourcePath = this?.resourcePath || 'signals-core.module.js';
  const original = new sources.OriginalSource(source, resourcePath);
  if (!this?.sourceMap) return replaceSource(original, insertions).source();

  let result;
  if (sidecar) {
    try {
      const mapped = new sources.SourceMapSource(source, resourcePath, sidecar);
      result = replaceSource(mapped, insertions).sourceAndMap();
    } catch {
      result = null;
    }
  }
  if (!result) {
    const mapped = inputMap ? new sources.SourceMapSource(source, resourcePath, inputMap) : original;
    result = replaceSource(mapped, insertions).sourceAndMap();
  }
  this.callback(null, result.source, result.map);
};
