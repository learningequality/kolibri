const { findVariable, getPropertyName } = require('@eslint-community/eslint-utils');
const { buildTypeTracer } = require('eslint-type-tracer');

const analyzers = new WeakMap();

function analyzeLocalCalls(sourceCode) {
  const trace = buildTypeTracer(sourceCode);
  const callsByFunction = new WeakMap();
  const typesByParameter = new WeakMap();

  function callsTo(func) {
    if (callsByFunction.has(func)) return callsByFunction.get(func);
    const binding = func.type === 'FunctionDeclaration' ? func : func.parent;
    const id = binding.id;
    const calls = [];
    let exclusive = false;
    if (
      id?.type === 'Identifier' &&
      (binding === func ||
        (binding.type === 'VariableDeclarator' && binding.parent.kind === 'const'))
    ) {
      const variable = sourceCode
        .getDeclaredVariables(binding)
        .find(candidate => candidate.identifiers.includes(id));
      if (
        variable &&
        variable.defs.length === 1 &&
        !variable.references.some(ref => ref.isWrite() && !ref.init)
      ) {
        const declaration = binding === func ? func : binding.parent;
        exclusive = !declaration.parent.type.startsWith('Export');
        for (const ref of variable.references) {
          if (!ref.isRead()) continue;
          const call = ref.identifier.parent;
          if (call.type === 'CallExpression' && call.callee === ref.identifier) calls.push(call);
          else exclusive = false;
        }
      }
    }
    const result = { calls, exclusive };
    callsByFunction.set(func, result);
    return result;
  }

  function parameterTypes(node) {
    if (node?.type !== 'Identifier') return null;
    const variable = findVariable(sourceCode.getScope(node), node);
    const definition = variable?.defs[0];
    if (
      definition?.type !== 'Parameter' ||
      definition.name.type !== 'Identifier' ||
      variable.references.some(ref => ref.isWrite())
    ) {
      return null;
    }
    if (typesByParameter.has(variable)) return typesByParameter.get(variable);
    typesByParameter.set(variable, null);
    const { calls, exclusive } = callsTo(definition.node);
    const index = definition.node.params.indexOf(definition.name);
    const types = new Set();
    let complete = exclusive && calls.length > 0;
    for (const call of calls) {
      const args = call.arguments.slice(0, index + 1);
      const arg = args[index];
      if (!arg || args.some(value => value.type === 'SpreadElement')) {
        complete = false;
        continue;
      }
      const traced = trace(arg);
      const forwarded = traced.length ? null : parameterTypes(arg);
      for (const type of forwarded?.types || traced) types.add(type);
      if (!traced.length && !forwarded?.complete) complete = false;
    }
    const result = { types, complete };
    typesByParameter.set(variable, result);
    return result;
  }
  return parameterTypes;
}

function getParameterTypes(sourceCode) {
  if (!analyzers.has(sourceCode)) analyzers.set(sourceCode, analyzeLocalCalls(sourceCode));
  return analyzers.get(sourceCode);
}

function withIteratorArguments(rule, method) {
  return {
    ...rule,
    create(context) {
      const { sourceCode } = context;
      const handlers = rule.create(context);
      const parameterTypes = getParameterTypes(sourceCode);
      const trace = buildTypeTracer(sourceCode);
      return {
        ...handlers,
        MemberExpression(node) {
          if (
            getPropertyName(node, sourceCode.getScope(node)) === method &&
            !trace(node.object).includes('Iterator') &&
            parameterTypes(node.object)?.types.has('Iterator')
          ) {
            context.report({
              node,
              messageId: 'forbidden',
              data: { name: `Iterator.prototype.${method}` },
            });
          } else {
            handlers.MemberExpression(node);
          }
        },
      };
    },
  };
}

function withDateFormatterArguments(rule) {
  return {
    ...rule,
    create(context) {
      const parameterTypes = getParameterTypes(context.sourceCode);
      return rule.create(
        Object.create(context, {
          report: {
            value(descriptor) {
              const node = descriptor.node;
              const receiver =
                node.type === 'MemberExpression'
                  ? node.object
                  : node.parent.parent.init || node.parent.parent.right;
              const inferred = parameterTypes(receiver);
              if (
                !(
                  inferred?.complete &&
                  inferred.types.size === 1 &&
                  inferred.types.has('Intl.DateTimeFormat')
                )
              ) {
                context.report(descriptor);
              }
            },
          },
        }),
      );
    },
  };
}

module.exports = { withIteratorArguments, withDateFormatterArguments };
