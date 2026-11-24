import MarkdownIt from 'markdown-it';
import math from 'markdown-it-math/no-default-renderer';

const blockDelimiters = [
  ['$$', '$$'],
  ['\\[', '\\]'],
];
const inlineDelimiters = [...blockDelimiters, ['$', '$'], ['\\(', '\\)']];
const paragraphInterrupts = ['paragraph', 'reference', 'blockquote', 'list'];

function lineText(state, line) {
  const start = state.bMarks[line] + state.tShift[line];
  let end = state.eMarks[line];
  while (
    end > start &&
    (state.src.charCodeAt(end - 1) === 0x20 || state.src.charCodeAt(end - 1) === 0x09)
  ) {
    end--;
  }
  return state.src.slice(start, end);
}

function closingLine(state, startLine, endLine, indent) {
  const firstLine = lineText(state, startLine).trim();
  const pair = blockDelimiters.find(([open]) => firstLine.startsWith(open));
  if (!pair) {
    return -1;
  }
  const [open, close] = pair;
  const firstContent = firstLine.slice(open.length);
  const firstClose = firstContent.indexOf(close);
  if (firstClose !== -1) {
    return firstClose === firstContent.length - close.length &&
      Boolean(firstContent.slice(0, firstClose).trim())
      ? startLine
      : -1;
  }
  let hasContent = Boolean(firstContent.trim());
  for (let line = startLine + 1; line < endLine; line++) {
    const text = lineText(state, line);
    const lineIndent = state.sCount[line];
    if (text && lineIndent < indent) {
      break;
    }
    if (lineIndent - indent >= 4) {
      if (text.endsWith(close)) {
        break;
      }
    } else {
      if (text !== close && blockDelimiters.some(([marker]) => text.startsWith(marker))) {
        break;
      }
      if (text.endsWith(close)) {
        return !text.slice(0, -close.length).includes(open) &&
          (hasContent || Boolean(text.slice(0, -close.length).trim()))
          ? line
          : -1;
      }
    }
    hasContent ||= Boolean(text.trim());
  }
  return -1;
}

function closerMissing(state, close, pos, closerlessFrom) {
  if (!closerlessFrom.has(state)) {
    closerlessFrom.set(state, new Map());
  }
  const missingFrom = closerlessFrom.get(state);
  if (pos >= (missingFrom.get(close) ?? Infinity)) {
    return true;
  }
  if (state.src.indexOf(close, pos) !== -1) {
    return false;
  }
  missingFrom.set(close, pos);
  return true;
}

function guardInlineMath(rule, closerlessFrom) {
  return (state, silent) => {
    const start = state.pos;
    if (
      inlineDelimiters.every(
        ([open, close]) =>
          !state.src.startsWith(open, start) ||
          closerMissing(state, close, start + open.length, closerlessFrom),
      ) ||
      !rule(state, true)
    ) {
      return false;
    }
    const end = state.pos;
    state.pos = start;
    const [open, close] = inlineDelimiters.find(([open]) => state.src.startsWith(open, start));
    const content = state.src.slice(start + open.length, end - close.length);
    if (
      end > state.posMax ||
      !content.trim() ||
      (open === '$' &&
        (/[0-9]/.test(state.src.charAt(end)) || /(?:^|[^\\])(\\*)$/.exec(content)[1].length % 2))
    ) {
      return false;
    }
    if (silent) {
      state.pos = end;
      return true;
    }
    rule(state, false);
    if (content.includes('\n')) {
      state.tokens[state.tokens.length - 1].content = content;
    }
    return true;
  };
}

const savedStateKeys = [
  'tokens',
  'env',
  'line',
  'level',
  'tight',
  'parentType',
  'lineMax',
  'blkIndent',
  'listIndent',
  'ddIndent',
];

function pluginRules(options) {
  const scratch = new MarkdownIt();
  const inline = scratch.inline.ruler.getRules('');
  const block = scratch.block.ruler.getRules('');
  scratch.use(math, options);
  return {
    inline: scratch.inline.ruler.getRules('').find(rule => !inline.includes(rule)),
    block: scratch.block.ruler.getRules('').find(rule => !block.includes(rule)),
  };
}

export function createMarkdown(renderFormula) {
  const markdown = new MarkdownIt({ html: false });
  const closerlessFrom = new WeakMap();
  const dollarRules = pluginRules({ inlineDelimiters: ['$$', '$'], blockDelimiters });
  const bracketRules = pluginRules({
    inlineDelimiters: [
      ['\\[', '\\]'],
      ['\\(', '\\)'],
    ],
    blockDelimiters: [],
    inlineAllowWhiteSpacePadding: true,
  });
  markdown.inline.ruler.before(
    'escape',
    'math_inline_dollar',
    guardInlineMath(dollarRules.inline, closerlessFrom),
  );
  markdown.inline.ruler.before(
    'escape',
    'math_inline_bracket',
    guardInlineMath(bracketRules.inline, closerlessFrom),
  );
  markdown.renderer.rules.math_inline = (tokens, index, options, env) => {
    const { content, markup } = tokens[index];
    return renderFormula(content, markup === '$$' || markup === '\\[', markdown, env);
  };
  markdown.renderer.rules.math_block = (tokens, index, options, env) =>
    `${renderFormula(tokens[index].content, true, markdown, env)}\n`;

  const closureCache = new WeakMap();
  const blockIndents = new WeakMap();
  const plainParses = new WeakSet();
  const tokenize = markdown.block.tokenize;
  markdown.block.tokenize = function (state, startLine, endLine) {
    if (!blockIndents.has(state)) {
      blockIndents.set(state, []);
    }
    const indents = blockIndents.get(state);
    indents.push(state.blkIndent);
    try {
      tokenize.call(this, state, startLine, endLine);
    } finally {
      indents.pop();
    }
  };
  function hasCodeBlock(state, startLine, closeLine, indent) {
    const saved = {};
    for (const key of savedStateKeys) {
      saved[key] = state[key];
    }
    state.tokens = [];
    state.env = {};
    state.blkIndent = indent;
    plainParses.add(state);
    let tokens;
    try {
      tokenize.call(markdown.block, state, startLine, closeLine + 1);
      tokens = state.tokens;
    } finally {
      plainParses.delete(state);
      Object.assign(state, saved);
    }
    return tokens.some(
      token =>
        token.type === 'fence' ||
        (token.type === 'code_block' && token.map[0] <= closeLine && closeLine < token.map[1]),
    );
  }
  markdown.block.ruler.after(
    'blockquote',
    'math_block',
    (state, startLine, endLine, silent) => {
      if (plainParses.has(state)) {
        return false;
      }
      if (!closureCache.has(state)) {
        closureCache.set(state, new Map());
      }
      const cache = closureCache.get(state);
      const startIndent = state.sCount[startLine];
      const indent = blockIndents
        .get(state)
        .reduce((found, level) => (level <= startIndent ? level : found), -1);
      if (indent < 0 || startIndent - indent >= 4) {
        return false;
      }
      const key = `${startLine}:${endLine}:${indent}:${state.bMarks[startLine]}:${state.tShift[startLine]}`;
      if (!cache.has(key)) {
        const closeLine = closingLine(state, startLine, endLine, indent);
        cache.set(key, closeLine >= 0 && !hasCodeBlock(state, startLine, closeLine, indent));
      }
      return cache.get(key) && dollarRules.block(state, startLine, endLine, silent);
    },
    { alt: paragraphInterrupts },
  );

  const renderInlineAsText = markdown.renderer.renderInlineAsText;
  markdown.renderer.renderInlineAsText = function (tokens, options, env) {
    const textTokens = tokens.map(token => {
      if (token.type !== 'math_inline') {
        return token;
      }
      const close = inlineDelimiters.find(([open]) => open === token.markup)[1];
      return { type: 'text', content: token.markup + token.content + close };
    });
    return renderInlineAsText.call(this, textTokens, options, env);
  };
  return markdown;
}

export function hasFormula(tokens) {
  return tokens.some(
    token =>
      token.type === 'math_block' || token.children?.some(child => child.type === 'math_inline'),
  );
}
