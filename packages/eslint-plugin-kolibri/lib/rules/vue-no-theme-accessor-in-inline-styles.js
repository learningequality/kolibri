/*
 * Reports a static theme value read through a JS accessor, in an inline `:style` binding
 * or in a style object built in the `<script>` block. The theme emits its variables on
 * `:root`, so `'var(--tokens-text)'` replaces the read in place.
 *
 * A `<script>` object is taken for a style object when one of its keys names a CSS
 * property. That is a guess. Only the CSS-named keys are rewritten, so a lookup table
 * keyed by a mix of names is rewritten in part. The guess is wrong wherever the value
 * never reaches a style, such as a canvas or chart configuration, where `var()` resolves
 * to nothing. The rule is limited to single file components to keep the guess near the
 * templates it is made for. A chart configuration inside a component is still rewritten.
 *
 * It is off in `kolibri-format`'s configuration. The rule carries a fixer and
 * `kolibri-format` runs ESLint with `fix: true`, so turning it on rewrites every call
 * site at once.
 *
 * A value combined with anything else is not matched, because no single `var()` replaces
 * it. Nor is a bracket access such as `$themeTokens['text']`. A ternary is matched on
 * each branch.
 */

const { all: KNOWN_CSS_PROPERTIES } = require('known-css-properties');
const { isThemeSourceError, themeRead } = require('kolibri-css-variables');

const CSS_PROPERTIES = new Set(KNOWN_CSS_PROPERTIES);

/**
 * Every static theme read a property's value resolves to, which is more than one when a
 * ternary chooses between them.
 * @param {object} node - The value of an object property.
 * @returns {Array<object>}
 */
function staticReads(node) {
  if (!node) {
    return [];
  }
  if (node.type === 'ConditionalExpression') {
    return [...staticReads(node.consequent), ...staticReads(node.alternate)];
  }
  return themeRead(node) ? [node] : [];
}

function isCssProperty(key) {
  // `backgroundColor` to `background-color`, and `WebkitFoo` to `-webkit-foo`
  return CSS_PROPERTIES.has(key.replace(/([A-Z])/g, '-$1').toLowerCase());
}

function propertyKey(property) {
  if (property.type !== 'Property' || property.computed) {
    return null;
  }
  if (property.key.type === 'Identifier') {
    return property.key.name;
  }
  if (property.key.type === 'Literal' && typeof property.key.value === 'string') {
    return property.key.value;
  }
  return null;
}

module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'disallow static theme values in inline `:style` bindings and style objects',
    },
    fixable: 'code',
    schema: [],
    messages: {
      staticThemeValue:
        "Replace `{{reference}}` with the string `'{{variable}}'`. A theme CSS variable " +
        'resolves in an inline style, so the declaration can stay where it is.',
      staticThemeValueUnknown:
        'Replace `{{reference}}` with the matching theme CSS variable as a string, such as ' +
        "`'var(--tokens-text)'`. This path names no variable the theme emits, so confirm " +
        'the spelling first.',
      themeSourceUnavailable: 'This rule cannot check theme values. {{reason}}',
    },
  },
  create(context) {
    const sourceCode = context.sourceCode || context.getSourceCode();
    const parserServices = sourceCode.parserServices || {};

    /**
     * The quote a replacement string must use, which is whichever one the surrounding
     * attribute does not. A `:style='...'` attribute cannot hold a single-quoted string.
     * @param {object} attribute - The `:style` attribute, or `null` in a `<script>`.
     * @returns {string}
     */
    function innerQuote(attribute) {
      if (!attribute) {
        return "'";
      }
      const text = sourceCode.getText(attribute);
      return text.slice(text.indexOf('=') + 1).trimStart()[0] === "'" ? '"' : "'";
    }

    let sourceErrorReported = false;

    /**
     * Runs `work`, turning a theme source that cannot be read into one report for this
     * file. The names are looked up only once a theme read turns up, so a component that
     * reads none is left alone.
     * @param {object} node - The node the report points at.
     * @param {Function} work - The scan to run.
     * @throws {Error} When `work` fails for any other reason.
     */
    function guarded(node, work) {
      if (sourceErrorReported) {
        return;
      }
      try {
        work();
      } catch (error) {
        if (!isThemeSourceError(error)) {
          throw error;
        }
        context.report({
          node,
          messageId: 'themeSourceUnavailable',
          data: { reason: error.message },
        });
        sourceErrorReported = true;
      }
    }

    function report(node, quote) {
      const { reference, variable } = themeRead(node);
      if (!variable) {
        context.report({ node, messageId: 'staticThemeValueUnknown', data: { reference } });
        return;
      }
      context.report({
        node,
        messageId: 'staticThemeValue',
        data: { reference, variable },
        fix: fixer => fixer.replaceText(node, `${quote}${variable}${quote}`),
      });
    }

    function reportObject(objectNode, keysMustBeCss, quote) {
      for (const property of objectNode.properties) {
        const key = propertyKey(property);
        if (key === null || (keysMustBeCss && !isCssProperty(key))) {
          continue;
        }
        staticReads(property.value).forEach(read => report(read, quote));
      }
    }

    /**
     * Every object the `:style` binding itself resolves to. An object anywhere else is an
     * argument to something, so its keys are that function's business, not CSS.
     * @param {object} node - The expression the binding holds.
     * @returns {Array<object>}
     */
    function styleObjects(node) {
      if (!node) {
        return [];
      }
      if (node.type === 'ObjectExpression') {
        return [node];
      }
      if (node.type === 'ArrayExpression') {
        return node.elements.flatMap(styleObjects);
      }
      if (node.type === 'ConditionalExpression') {
        return [...styleObjects(node.consequent), ...styleObjects(node.alternate)];
      }
      if (node.type === 'LogicalExpression') {
        return styleObjects(node.right);
      }
      return [];
    }

    // every key of a style object is a CSS property already
    const templateVisitor = {
      'VAttribute[directive=true]'(attribute) {
        const key = attribute.key;
        if (
          key.name.name !== 'bind' ||
          !key.argument ||
          key.argument.type !== 'VIdentifier' ||
          key.argument.name !== 'style' ||
          !attribute.value ||
          !attribute.value.expression
        ) {
          return;
        }
        const quote = innerQuote(attribute);
        guarded(attribute, () =>
          styleObjects(attribute.value.expression).forEach(node =>
            reportObject(node, false, quote),
          ),
        );
      },
    };

    // an object with CSS property keys is a style object, wherever it is built
    const scriptVisitor = {
      ReturnStatement(node) {
        if (node.argument && node.argument.type === 'ObjectExpression') {
          guarded(node, () => reportObject(node.argument, true, innerQuote(null)));
        }
      },
      ArrowFunctionExpression(node) {
        if (node.body.type === 'ObjectExpression') {
          guarded(node, () => reportObject(node.body, true, innerQuote(null)));
        }
      },
      VariableDeclarator(node) {
        // a destructuring pattern reads the object rather than holding it
        if (node.id.type !== 'Identifier') {
          return;
        }
        if (node.init && node.init.type === 'ObjectExpression') {
          guarded(node, () => reportObject(node.init, true, innerQuote(null)));
        }
      },
    };

    // the parser service alone would also cover a `.js` file that a project points
    // `vue-eslint-parser` at, so the name is checked too
    const filename = context.filename || context.getFilename();
    if (!parserServices.defineTemplateBodyVisitor || !filename.endsWith('.vue')) {
      return {};
    }
    return parserServices.defineTemplateBodyVisitor(templateVisitor, scriptVisitor);
  },
};
