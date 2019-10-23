'use strict';

const eslintPluginVueUtils = require('eslint-plugin-vue/lib/utils');

const { GROUP_WATCH, GROUP_METHODS, PROPERTY_LABEL } = require('./constants');

module.exports = {
  /**
   * Extract names from references objects
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
   */
  checkVueEslintParser(context) {
    if (context.parserServices.getTemplateBodyTokenStore == null) {
      context.report({
        loc: { line: 1, column: 0 },
        message:
          'Use the latest vue-eslint-parser. See also https://vuejs.github.io/eslint-plugin-vue/user-guide/#what-is-the-use-the-latest-vue-eslint-parser-error.',
      });

      return false;
    }

    return true;
  },

  /**
   * Get an array of watchers names.
   * @param {Object} obj Vue object
   */
  getWatchersNames(obj) {
    const watchers = Array.from(
      eslintPluginVueUtils.iterateProperties(obj, new Set([GROUP_WATCH]))
    );
    return watchers.map(watcher => watcher.name);
  },

  /**
   * Return an array containing end locations of all comments containing
   * jsdoc's `@public`
   */
  getPublicCommentsEnds(comments) {
    return comments
      .filter(comment => comment.value.includes('@public'))
      .map(comment => comment.loc.end.line);
  },

  /**
   * Extract name from a directive dynamic argument node.
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
   */
  executeOnThisExpressionProperty(func) {
    return {
      'MemberExpression[object.type="ThisExpression"][property.type="Identifier"][property.name]'(
        node
      ) {
        func(node.property);
      },
    };
  },

  /**
   * Run callback on beforeRouteEnter component instance property.
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
   * Run callback on watch string method literal node, e.g. on `add` literal node in
   * watch: {
   *   counter: 'add'
   * }
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
   * <a :[attributeName]="..."> ... </a>
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
   * @param {Array} disabledLines An array of lines to not be reported, e.g. [14, 24]
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
   * Report unused Vuex properties.
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
};
