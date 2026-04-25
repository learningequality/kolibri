'use strict';

const eslintPluginVueUtils = require('eslint-plugin-vue/lib/utils');

const { GROUP_WATCH, GROUP_METHODS, PROPERTY_LABEL } = require('./constants');

/** @typedef {import('estree').Node} ASTNode */

module.exports = {
  /**
   * Extract the called method name from a CallExpression node, such as:
   * `screen.getByText(...)` => `'getByText'`
   * `getByText(...)` => `'getByText'`
   * @param {ASTNode} node - A CallExpression node.
   * @returns {string|null} The called method name, or null if not found.
   */
  getCallMethodName(node) {
    if (node.callee.type === 'MemberExpression') {
      return node.callee.property.name || null;
    }
    if (node.callee.type === 'Identifier') {
      return node.callee.name || null;
    }
    return null;
  },

  /**
   * Safely access parserServices from the ESLint rule context.
   * In ESLint 9 flat config, parserServices moved to context.sourceCode.parserServices.
   * @param {object} context - The ESLint rule context.
   * @returns {object|null} The parser services object, or null if unavailable.
   */
  getParserServices(context) {
    return context.sourceCode && context.sourceCode.parserServices;
  },

  /**
   * Extract names from references objects
   * @param {object[]} references - Array of reference objects.
   * @returns {string[]} Array of reference names.
   */
  getReferencesNames(references) {
    if (!references || !references.length) {
      return [];
    }

    return references.map(reference => {
      if (!reference.id || !reference.id.name) {
        return;
      }

      return reference.id.name;
    });
  },

  /**
   * Check if there's vue-eslint-parser available.
   * If not, report a problem.
   * @param {object} context - The ESLint rule context.
   * @returns {boolean} True if vue-eslint-parser is available, false otherwise.
   */
  checkVueEslintParser(context) {
    const parserServices = this.getParserServices(context);
    if (!parserServices || parserServices.getTemplateBodyTokenStore == null) {
      // Only report the error for .vue files — non-Vue files are expected
      // to lack the Vue parser and should be silently skipped.
      const filename = context.filename;
      if (filename && filename.endsWith('.vue')) {
        context.report({
          loc: { line: 1, column: 0 },
          message:
            'Use the latest vue-eslint-parser. See also https://vuejs.github.io/eslint-plugin-vue/user-guide/#what-is-the-use-the-latest-vue-eslint-parser-error.',
        });
      }
      return false;
    }

    return true;
  },

  /**
   * Get an array of watchers names.
   * @param {object} obj - Vue component options object.
   * @returns {string[]} Array of watcher names.
   */
  getWatchersNames(obj) {
    const watchers = Array.from(
      eslintPluginVueUtils.iterateProperties(obj, new Set([GROUP_WATCH])),
    );
    return watchers.map(watcher => watcher.name);
  },

  /**
   * Return an array containing end locations of all comments containing
   * jsdoc's `@public`
   * @param {object[]} comments - Array of comment nodes.
   * @returns {number[]} Array of line numbers where `@public` comments end.
   */
  getPublicCommentsEnds(comments) {
    return comments
      .filter(comment => comment.value.includes('@public'))
      .map(comment => comment.loc.end.line);
  },

  /**
   * Extract name from a directive dynamic argument node.
   * @param {object} node - The directive key node.
   * @returns {string|null} The dynamic argument name, or null if not found.
   */
  getDirectiveDynamicArgName(node) {
    if (!node.raw || !node.raw.argument || !node.raw.argument.length) {
      return null;
    }

    const rawArg = node.raw.argument;

    if (rawArg[0] !== '[' || rawArg.slice(-1) !== ']') {
      return null;
    }

    return rawArg.slice(1, rawArg.length - 1);
  },

  /**
   * Run callback on this expression properties nodes.
   * @param {Function} func - Callback to run on each matching node.
   * @returns {object} ESLint AST visitor object.
   */
  executeOnThisExpressionProperty(func) {
    return {
      'MemberExpression[object.type="ThisExpression"][property.type="Identifier"][property.name]'(
        node,
      ) {
        func(node.property);
      },
    };
  },

  /**
   * Run callback on beforeRouteEnter component instance property.
   * @param {Function} func - Callback to run on each matching node.
   * @returns {object} ESLint AST visitor object.
   */
  executeOnBefoureRouteEnterInstanceProperty(func) {
    let instanceParamName;

    return {
      'Property[key.name=beforeRouteEnter] CallExpression[callee.name=next][arguments]'(node) {
        if (node.arguments.length && node.arguments[0].params && node.arguments[0].params.length) {
          instanceParamName = node.arguments[0].params[0].name;
        }
      },
      'MemberExpression[object.name]'(node) {
        if (node.object.name === instanceParamName) {
          func(node.property);
        }
      },
    };
  },

  /**
   * Run callback on watch string method literal node, e.g. on `add` literal node in:
   *
   * watch: {
   * counter: 'add',
   * }
   * @param {Function} func - Callback to run on each matching node.
   * @returns {object} ESLint AST visitor object.
   */
  executeOnWatchStringMethod(func) {
    return {
      'Property[key.name=watch] ObjectExpression[properties] Literal[value]'(node) {
        func(node);
      },
    };
  },

  /**
   * Run callback on directive dynamic argument node, e.g. on
   * `<a :[attributeName]="..."> ... </a>`.
   * @param {Function} func - Callback to run on each matching node.
   * @returns {object} ESLint AST visitor object.
   */
  executeOnDirectiveDynamicArg(func) {
    return {
      'VDirectiveKey[argument]'(node) {
        if (!node.raw || !node.raw.argument || !node.raw.argument.length) {
          return;
        }

        const rawArg = node.raw.argument;
        if (rawArg[0] !== '[' || rawArg.slice(-1) !== ']') {
          return;
        }

        func(node);
      },
    };
  },

  /**
   * Run callback when end of the root template reached.
   * @param {Function} func - Callback to run when root template ends.
   * @returns {object} ESLint AST visitor object.
   */
  executeOnRootTemplateEnd(func) {
    let rootTemplateEnd;

    return {
      "VElement[name='template']"(node) {
        if (rootTemplateEnd) {
          return;
        }

        rootTemplateEnd = node.loc.end;
      },
      "VElement[name='template']:exit"(node) {
        if (node.loc.end !== rootTemplateEnd) {
          return;
        }

        func();
      },
    };
  },

  /**
   * Report unused Vue component properties.
   * @param {object} context - The ESLint rule context.
   * @param {object[]} properties - Array of property objects to check.
   * @param {number[]} disabledLines - An array of lines to not be reported, e.g. [14, 24].
   * @returns {void}
   */
  reportUnusedProperties(context, properties, disabledLines) {
    if (!properties || !properties.length) {
      return;
    }

    properties.forEach(property => {
      if (disabledLines && disabledLines.includes(property.node.loc.start.line)) {
        return;
      }

      let message = `Unused ${PROPERTY_LABEL[property.groupName]} found: "${property.name}"`;
      if (property.groupName === GROUP_METHODS) {
        message = `${message}. If the method is supposed to be public, you might have forgotten to add a @public tag.`;
      }

      context.report({
        node: property.node,
        message,
      });
    });
  },

  /**
   * Report Vuex properties that are mapped but never used in the component.
   * @param {object} context - The ESLint rule context.
   * @param {object[]} properties - Array of property objects to check.
   * @returns {void}
   */
  reportUnusedVuexProperties(context, properties) {
    if (!properties || !properties.length) {
      return;
    }

    properties.forEach(property => {
      context.report({
        node: property.node,
        message: `Unused Vuex ${property.kind} found: "${property.name}"`,
      });
    });
  },

  /**
   * Report unused translation definitions.
   * @param {object} context - The ESLint rule context.
   * @param {object[]} definitions - Array of translation definition objects.
   * @param {string[]} uses - Array of translation keys that are used.
   * @returns {void}
   */
  reportUnusedTranslations(context, definitions, uses) {
    const unused = definitions.filter(prop => !uses.includes(prop.name));

    unused.forEach(prop => {
      context.report({
        node: prop.node,
        message: `Unused message found in $trs: "${prop.node.name}"`,
      });
    });
  },

  /**
   * Report uses of undefined strings
   * @param {object} context - The ESLint rule context.
   * @param {object[]} definitions - Array of translation definition objects.
   * @param {object[]} uses - Array of translation use objects.
   * @returns {void}
   */
  reportUseOfUndefinedTranslation(context, definitions, uses) {
    const definedStrings = definitions.map(prop => prop.name);
    const badAttempts = uses.filter(prop => !definedStrings.includes(prop.value));

    badAttempts.forEach(node => {
      context.report({
        node,
        message: `Message not defined in $trs: "${node.value}"`,
      });
    });
  },

  /**
   * Report improper translation string definitions
   * @param {object} context - The ESLint rule context.
   * @param {object[]} normalDefinitionNodes - Array of normal definition node objects.
   * @returns {void}
   */
  reportImproperTranslationString(context, normalDefinitionNodes) {
    const trsNodes = normalDefinitionNodes.map(prop => prop.name);

    trsNodes.forEach(node => {
      context.report({
        node,
        message: `Invalid translation string format detected in $trs: "${node.key.name}". Ensure proper formatting for translation strings.
        `,
      });
    });
  },
};
