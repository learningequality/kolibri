'use strict';

const eslintPluginVueUtils = require('eslint-plugin-vue/lib/utils');

const GROUP_WATCHER = 'watch';

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
   * @param {Object} obj Vue objec
   */
  getWatchersNames(obj) {
    const watchers = Array.from(
      eslintPluginVueUtils.iterateProperties(obj, new Set([GROUP_WATCHER]))
    );
    return watchers.map(watcher => watcher.name);
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
};
