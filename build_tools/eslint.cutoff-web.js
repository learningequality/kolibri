const coreJsCompat = require('core-js-compat');
const {
  ReferenceTracker,
  findVariable,
  getPropertyName,
  READ,
  CALL,
  CONSTRUCT,
} = require('@eslint-community/eslint-utils');
const { browsers } = require('browserslist-config-kolibri/cutoff');

const excluded = new Set(
  coreJsCompat({
    targets: browsers,
    version: require('core-js/package.json').version,
    filter: /^web\./,
  }).list,
);

function searchParamMethod(polyfill) {
  return { [CALL]: { polyfill, minArgs: 2 }, call: { [CALL]: { polyfill, minArgs: 3 } } };
}

const searchParamMembers = {
  size: { [READ]: 'web.url-search-params.size' },
  has: searchParamMethod('web.url-search-params.has'),
  delete: searchParamMethod('web.url-search-params.delete'),
};
const urlMembers = { searchParams: searchParamMembers };
const urlTrace = {
  URL: {
    canParse: { [READ]: 'web.url.can-parse' },
    parse: { [READ]: 'web.url.parse', [CALL]: urlMembers },
    [CONSTRUCT]: urlMembers,
  },
  URLSearchParams: { [CONSTRUCT]: searchParamMembers },
};
const sandboxTrace = {
  ...urlTrace,
  DOMException: { [CONSTRUCT]: { stack: { [READ]: 'web.dom-exception.stack' } } },
  setImmediate: { [READ]: 'web.immediate' },
  clearImmediate: { [READ]: 'web.immediate' },
  structuredClone: { [READ]: 'web.structured-clone' },
};

class CutoffReferenceTracker extends ReferenceTracker {
  visited = new WeakMap();

  *_iteratePropertyReferences(node, path, traceMap) {
    if (!this.visited.has(node)) this.visited.set(node, new Set());
    const traces = this.visited.get(node);
    if (traces.has(traceMap)) return;
    traces.add(traceMap);
    yield* super._iteratePropertyReferences(node, path, traceMap);
  }

  *iterateSearchParamBindings(property) {
    yield* this._iterateLhsReferences(property.value, ['searchParams'], searchParamMembers);
  }
}

function arrayElements(node, sourceCode) {
  if (node.type === 'ArrayExpression') return node.elements;
  if (node.type !== 'Identifier') return null;

  const variable = findVariable(sourceCode.getScope(node), node);
  const definition = variable?.defs[0];
  if (
    definition?.type === 'Variable' &&
    definition.parent.kind === 'const' &&
    definition.node.id === definition.name &&
    definition.node.init?.type === 'ArrayExpression' &&
    variable.references.every(
      reference => !reference.isRead() || reference.identifier.parent.type === 'SpreadElement',
    )
  ) {
    return definition.node.init.elements;
  }
  return null;
}

function argumentCount(args, limit, sourceCode, counts) {
  if (counts.has(args)) return Math.min(counts.get(args), limit);
  counts.set(args, Infinity);
  let count = 0;
  for (const arg of args) {
    if (arg?.type === 'SpreadElement') {
      const elements = arrayElements(arg.argument, sourceCode);
      count += elements ? argumentCount(elements, limit, sourceCode, counts) : limit;
    } else {
      count += 1;
    }
    if (count >= limit) break;
  }
  count = Math.min(count, limit);
  counts.set(args, count);
  return count;
}

const webGlobals = Object.fromEntries(
  [...Object.keys(sandboxTrace), 'self', 'window'].map(name => [name, 'readonly']),
);

const noExcludedWebApi = {
  meta: {
    schema: [{ enum: ['sandbox'] }],
    messages: { excluded: '{{polyfill}} is not available at the browser cutoff.' },
  },
  create(context) {
    const { sourceCode } = context;
    const searchParams = [];
    const bindings = [];
    const reported = new WeakMap();
    const counts = new Map();
    function report(node, polyfill) {
      if (!excluded.has(polyfill)) return;
      if (!reported.has(node)) reported.set(node, new Set());
      const polyfills = reported.get(node);
      if (polyfills.has(polyfill)) return;
      polyfills.add(polyfill);
      context.report({ node, messageId: 'excluded', data: { polyfill } });
    }

    return {
      MemberExpression(node) {
        if (getPropertyName(node, sourceCode.getScope(node)) === 'searchParams') {
          searchParams.push(node);
        }
      },
      'ObjectPattern > Property'(node) {
        if (getPropertyName(node, sourceCode.getScope(node)) === 'searchParams') {
          bindings.push(node);
        }
      },
      'Program:exit'(program) {
        const tracker = new CutoffReferenceTracker(sourceCode.getScope(program));
        function check({ node, info, type }) {
          if (type === READ) {
            report(node, info);
          } else if (info.minArgs) {
            if (argumentCount(node.arguments, 3, sourceCode, counts) >= info.minArgs) {
              report(node, info.polyfill);
            }
          } else {
            for (const reference of tracker.iteratePropertyReferences(node, info)) check(reference);
          }
        }
        const trace = context.options[0] === 'sandbox' ? sandboxTrace : urlTrace;
        for (const reference of tracker.iterateGlobalReferences(trace)) check(reference);
        for (const node of searchParams) {
          for (const reference of tracker.iteratePropertyReferences(node, searchParamMembers)) {
            check(reference);
          }
        }
        for (const binding of bindings) {
          for (const reference of tracker.iterateSearchParamBindings(binding)) check(reference);
        }
      },
    };
  },
};

module.exports = { noExcludedWebApi, webGlobals };
