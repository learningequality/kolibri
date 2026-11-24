import { Linter } from 'eslint';

function copyNode(node, visitorKeys) {
  if (!node) return node;
  const copy = { ...node };
  delete copy.parent;
  for (const key of visitorKeys[node.type] || []) {
    const child = node[key];
    copy[key] = Array.isArray(child)
      ? child.map(element => copyNode(element, visitorKeys))
      : copyNode(child, visitorKeys);
  }
  return copy;
}

function templateStatements(container, visitorKeys) {
  const { expression, references } = container;
  if (!expression) return [];
  const { loc, range } = expression;
  const location = { loc, range };
  const statement = node => ({ type: 'ExpressionStatement', expression: node, ...location });
  const block = body => ({ type: 'BlockStatement', body, ...location });
  const visit = node => copyNode(node, visitorKeys);
  const scope = (params, body) =>
    statement({
      type: 'ArrowFunctionExpression',
      params,
      body: block(body),
      expression: false,
      ...location,
    });
  let body;
  switch (expression.type) {
    case 'VForExpression':
      body = [statement(visit(expression.right)), scope(expression.left.map(visit), [])];
      break;
    case 'VOnExpression':
      body = expression.body.map(visit);
      break;
    case 'VSlotScopeExpression':
      body = [scope(expression.params.map(visit), [])];
      break;
    case 'VFilterSequenceExpression':
      body = [expression.expression, ...expression.filters.flatMap(filter => filter.arguments)].map(
        node => statement(visit(node)),
      );
      break;
    default:
      body = [statement(visit(expression))];
  }
  const templateBindings = new Map(
    references.filter(reference => reference.variable).map(({ id }) => [id.name, id]),
  );
  return [scope([...templateBindings.values()].map(visit), body)];
}

export default function templateCutoff(cutoffConfig) {
  const rule = {
    meta: { messages: { cutoff: '{{message}} ({{ruleId}})' } },
    create(context) {
      const { sourceCode } = context;
      const template = sourceCode.ast.templateBody;
      if (!template) return {};
      const body = [];
      return sourceCode.parserServices.defineTemplateBodyVisitor({
        VExpressionContainer(node) {
          body.push(...templateStatements(node, sourceCode.visitorKeys));
        },
        'VElement:exit'(node) {
          if (node !== template || !body.length) return;
          const ast = {
            type: 'Program',
            sourceType: 'module',
            body,
            loc: template.loc,
            range: template.range,
            comments: [],
            tokens: sourceCode.parserServices.getTemplateBodyTokenStore().getTokens(template),
          };
          const parser = { parse: () => ast };
          const messages = new Linter().verify(sourceCode.text, [
            ...cutoffConfig,
            { languageOptions: { parser }, linterOptions: { noInlineConfig: true } },
          ]);
          for (const { ruleId, message, line, column, endLine, endColumn } of messages) {
            if (!ruleId) continue;
            context.report({
              loc: {
                start: { line, column: column - 1 },
                end: { line: endLine ?? line, column: (endColumn ?? column) - 1 },
              },
              messageId: 'cutoff',
              data: { message, ruleId },
            });
          }
        },
      });
    },
  };
  return {
    files: ['**/*.vue'],
    plugins: { template: { rules: { cutoff: rule } } },
    rules: { 'template/cutoff': 'error' },
  };
}
