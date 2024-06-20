/**
 * @fileoverview Enforce line breaks style after opening and before closing block-level tags.
 * Vendored and modified from:
 * https://github.com/vuejs/eslint-plugin-vue/blob/9b55f3c18403b0a77808ba758ec3a8e72a884036/lib/rules/block-tag-newline.js
 */
'use strict';
const utils = require('eslint-plugin-vue/lib/utils');

/**
 * @param {string} text Source code as a string.
 * @returns {number}
 */
function getLinebreakCount(text) {
  return text.split(/\r\n|[\r\n\u2028\u2029]/gu).length - 1;
}

// Use a more complex regex to avoid capturing whitespace that is
// leading whitespace on a line that is not empty.
const beforeTextRegex = /^(\s(\r\n|[\r\n\u2028\u2029])|(\r\n|[\r\n\u2028\u2029]))*/u;

const emptyLines = 1;

/**
 * @param {number} lineBreaks
 */
function getPhrase(lineBreaks) {
  switch (lineBreaks) {
    case 1:
      return '1 line break';
    default:
      return `${lineBreaks} line breaks`;
  }
}

// ------------------------------------------------------------------------------
// Rule Definition
// ------------------------------------------------------------------------------

module.exports = {
  meta: {
    type: 'layout',
    docs: {
      description: 'enforce line breaks after opening and before closing block-level tags',
      categories: undefined,
    },
    fixable: 'whitespace',
    messages: {
      expectedOpeningLinebreak: "Expected {{expected}} after '<{{tag}}>', but {{actual}} found.",
      expectedClosingLinebreak: "Expected {{expected}} before '</{{tag}}>', but {{actual}} found.",
    },
  },
  /** @param {RuleContext} context */
  create(context) {
    const df =
      context.parserServices.getDocumentFragment && context.parserServices.getDocumentFragment();
    if (!df) {
      return {};
    }

    const sourceCode = context.getSourceCode();

    /**
     * @param {VStartTag} startTag
     * @param {string} beforeText
     * @param {number} beforeLinebreakCount
     * @returns {void}
     */
    function verifyBeforeSpaces(startTag, beforeText, beforeLinebreakCount) {
      if (emptyLines !== beforeLinebreakCount - 1) {
        context.report({
          loc: {
            start: startTag.loc.end,
            end: sourceCode.getLocFromIndex(startTag.range[1] + beforeText.length),
          },
          messageId: 'expectedOpeningLinebreak',
          data: {
            tag: startTag.parent.name,
            expected: getPhrase(emptyLines + 1),
            actual: getPhrase(beforeLinebreakCount),
          },
          fix(fixer) {
            return fixer.replaceTextRange(
              [startTag.range[1], startTag.range[1] + beforeText.length],
              '\n'.repeat(emptyLines + 1),
            );
          },
        });
      }
    }
    /**
     * @param {VEndTag} endTag
     * @param {string} afterText
     * @param {number} afterLinebreakCount
     * @returns {void}
     */
    function verifyAfterSpaces(endTag, afterText, afterLinebreakCount) {
      if (emptyLines !== afterLinebreakCount - 1) {
        context.report({
          loc: {
            start: sourceCode.getLocFromIndex(endTag.range[0] - afterText.length),
            end: endTag.loc.start,
          },
          messageId: 'expectedClosingLinebreak',
          data: {
            tag: endTag.parent.name,
            expected: getPhrase(emptyLines + 1),
            actual: getPhrase(afterLinebreakCount),
          },
          fix(fixer) {
            return fixer.replaceTextRange(
              [endTag.range[0] - afterText.length, endTag.range[0]],
              '\n'.repeat(emptyLines + 1),
            );
          },
        });
      }
    }
    /**
     * @param {VElement} element
     * @returns {void}
     */
    function verifyElement(element) {
      const { startTag, endTag } = element;
      if (startTag.selfClosing || endTag == null) {
        return;
      }
      const text = sourceCode.text.slice(startTag.range[1], endTag.range[0]);

      const trimText = text.trim();
      if (!trimText) {
        return;
      }

      const beforeText = /** @type {RegExpExecArray} */ (beforeTextRegex.exec(text))[0];
      const afterText = /** @type {RegExpExecArray} */ (/\s*$/u.exec(text))[0];
      const beforeLinebreakCount = getLinebreakCount(beforeText);
      const afterLinebreakCount = getLinebreakCount(afterText);

      verifyBeforeSpaces(startTag, beforeText, beforeLinebreakCount);

      verifyAfterSpaces(endTag, afterText, afterLinebreakCount);
    }

    const documentFragment = df;

    return utils.defineTemplateBodyVisitor(
      context,
      {},
      {
        /** @param {Program} node */
        Program(node) {
          if (utils.hasInvalidEOF(node)) {
            return;
          }

          for (const element of documentFragment.children) {
            if (utils.isVElement(element)) {
              verifyElement(element);
            }
          }
        },
      },
    );
  },
};
