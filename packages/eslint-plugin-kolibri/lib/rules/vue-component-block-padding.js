/**
 * @fileoverview Require padding lines between blocks
 * Vendored and modified from:
 * https://github.com/vuejs/eslint-plugin-vue/blob/9b55f3c18403b0a77808ba758ec3a8e72a884036/lib/rules/padding-line-between-blocks.js
 * Modified for two padded lines.
 */
'use strict';
const utils = require('eslint-plugin-vue/lib/utils');

/**
 * Split the source code into multiple lines based on the line delimiters.
 * @param {string} text Source code as a string.
 * @returns {string[]} Array of source code lines.
 */
function splitLines(text) {
  return text.split(/\r\n|[\r\n\u2028\u2029]/gu);
}

/**
 * Check and report blocks.
 * This autofix inserts two blank lines between the given 2 blocks.
 * @param {RuleContext} context The rule context to report.
 * @param {VElement} prevBlock The previous block to check.
 * @param {VElement} nextBlock The next block to check.
 * @param {Token[]} betweenTokens The array of tokens between blocks.
 * @returns {void}
 * @private
 */
function verifyForAlways(context, prevBlock, nextBlock, betweenTokens) {
  const tokenOrNodes = [...betweenTokens, nextBlock];
  /** @type {ASTNode | Token} */
  let prev = prevBlock;
  let linebreaks = 0;
  /** @type {ASTNode | Token | undefined} */
  let linebreak;
  const paddingLines = [];
  for (const tokenOrNode of tokenOrNodes) {
    const numOfLineBreaks = tokenOrNode.loc.start.line - prev.loc.end.line;
    if (numOfLineBreaks == 3) {
      return;
    }
    if (numOfLineBreaks > 3) {
      paddingLines.push([prev, tokenOrNode]);
    } else {
      if (!linebreak && numOfLineBreaks > 0) {
        linebreak = prev;
      }
      linebreaks = Math.max(linebreaks, numOfLineBreaks);
    }
    prev = tokenOrNode;
  }

  context.report({
    node: nextBlock,
    messageId: 'always',
    *fix(fixer) {
      if (paddingLines.length) {
        for (const [prevToken, nextToken] of paddingLines) {
          const start = prevToken.range[1];
          const end = nextToken.range[0];
          const paddingText = context.getSourceCode().text.slice(start, end);
          const lastSpaces = splitLines(paddingText).pop();
          yield fixer.replaceTextRange([start, end], `\n\n\n${lastSpaces}`);
        }
      } else {
        const lines = new Array(3 - linebreaks).fill('\n').join('');
        yield fixer.insertTextAfter(linebreak ? linebreak : prevBlock, lines);
      }
    },
  });
}

// ------------------------------------------------------------------------------
// Rule Definition
// ------------------------------------------------------------------------------

module.exports = {
  meta: {
    type: 'layout',
    docs: {
      description: 'require TWO padding lines between blocks',
      categories: undefined,
    },
    fixable: 'whitespace',
    messages: {
      always: 'Expected two blank lines before this block.',
    },
  },
  /** @param {RuleContext} context */
  create(context) {
    if (!context.parserServices.getDocumentFragment) {
      return {};
    }
    const df = context.parserServices.getDocumentFragment();
    if (!df) {
      return {};
    }
    const documentFragment = df;

    const paddingType = { verify: verifyForAlways };

    /** @type {Token[]} */
    let tokens;
    /**
     * @returns {VElement[]}
     */
    function getTopLevelHTMLElements() {
      return documentFragment.children.filter(utils.isVElement);
    }

    /**
     * @param {VElement} prev
     * @param {VElement} next
     */
    function getTokenAndCommentsBetween(prev, next) {
      // When there is no <template>, tokenStore.getTokensBetween cannot be used.
      if (!tokens) {
        tokens = [
          ...documentFragment.tokens.filter(token => token.type !== 'HTMLWhitespace'),
          ...documentFragment.comments,
        ].sort((a, b) => {
          if (a.range[0] > b.range[0]) return 1;
          return a.range[0] < b.range[0] ? -1 : 0;
        });
      }

      let token = tokens.shift();

      const results = [];
      while (token) {
        if (prev.range[1] <= token.range[0]) {
          if (next.range[0] <= token.range[0]) {
            tokens.unshift(token);
            break;
          } else {
            results.push(token);
          }
        }
        token = tokens.shift();
      }

      return results;
    }

    return utils.defineTemplateBodyVisitor(
      context,
      {},
      {
        /** @param {Program} node */
        Program(node) {
          if (utils.hasInvalidEOF(node)) {
            return;
          }
          const elements = [...getTopLevelHTMLElements()];

          let prev = elements.shift();
          for (const element of elements) {
            if (!prev) {
              return;
            }
            const betweenTokens = getTokenAndCommentsBetween(prev, element);
            paddingType.verify(context, prev, element, betweenTokens);
            prev = element;
          }
        },
      },
    );
  },
};
