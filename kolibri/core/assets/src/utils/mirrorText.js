import IntlMessageFormatParser from 'intl-messageformat-parser';

// Adapted from https://github.com/ppatotski/app-localizer

const mapping = {
  0: '0',
  ' ': ' ',
  1: '1',
  2: '2',
  3: 'Ƹ',
  4: '4',
  5: '5',
  6: '6',
  7: '7',
  8: '8',
  9: '9',
  ';': '⁏',
  '?': '␚',
  A: 'A',
  B: '&#x1660;',
  C: 'Ɔ',
  D: 'ᗡ',
  E: 'Ǝ',
  F: 'ᖷ',
  G: 'Ꭾ',
  H: 'H',
  I: 'I',
  J: 'Ⴑ',
  K: 'ᐴ',
  L: '⅃',
  M: 'M',
  N: 'И',
  O: 'O',
  P: 'ꟼ',
  Q: 'Ọ',
  R: 'Я',
  S: 'Ƨ',
  T: 'T',
  U: 'U',
  V: 'V',
  W: 'W',
  X: 'X',
  Y: 'Y',
  Z: 'Ƹ',
  a: 'ɒ',
  b: 'd',
  c: 'ɔ',
  d: 'b',
  e: 'ɘ',
  f: 'ʇ',
  g: 'ǫ',
  h: 'ʜ',
  i: 'i',
  j: 'Ⴑ',
  k: 'ʞ',
  l: 'l',
  m: 'm',
  n: 'n',
  o: 'o',
  p: 'q',
  q: 'p',
  r: 'ɿ',
  s: 'ƨ',
  t: 'ƚ',
  u: 'u',
  v: 'v',
  w: 'w',
  x: 'x',
  y: 'y',
  z: 'z',
};

console.log(mapping);

/**
 * @typedef GeneratorOptions
 * @type {Object}
 * @property {number} expander Sentance expanding factor (0.3 = 30%).
 * @property {number} wordexpander Word expanding factor (0.5 = 50%).
 * @property {boolean} accents Convert letter to its accent version.
 * @property {boolean} exclamations Enclose in exclamations.
 * @property {boolean} brackets Enclose in brackets.
 * @property {boolean} rightToLeft Left-to-Right.
 * @property {boolean} forceException throw syntax exception if any.
 *
 * @typedef PseudoLocalizerOptions
 * @property {number} expander Sentance expanding factor (0.3 = 30%).
 * @property {number} wordexpander Word expanding factor (0.5 = 50%).
 * @property {boolean} accents Convert letter to its accent version.
 * @property {boolean} exclamations Enclose in exclamations.
 * @property {boolean} brackets Enclose in brackets.
 * @property {boolean} rightToLeft Left-to-Right.
 * @property {string} format Structure of locale file content (polymer, angular.flat).
 *
 * @typedef ValidateOptions
 * @property {boolean} multiFile Locale is localed in separate file.
 * @property {string} fileStructure Structure of locale file content (polymer, angular.flat).
*/

/**
 * Transform sentences into expanded sentences with accents.
 *
 * @param {string} text Sentences.
 * @param {GeneratorOptions} options Generator options.
 * @returns {string} Pseudo generated sentences.
 */
function transformSentences(text, options) {
  if (options && text && text !== ' ') {
    let words = text.split(' ');
    const expand = function expand(items, factor, callback) {
      const extraCount = Math.round(items.length * factor);
      let extraPosition = 0;
      for (let i = 0; i < extraCount; i += 1) {
        const position = Math.round(extraPosition);
        const expandedPosition =
          Math.round((items.length + extraCount - 1) / (items.length - 1) * extraPosition) + 1;
        callback(expandedPosition, items[position]);
        extraPosition += (items.length - 1) / extraCount;
      }
    };

    if (options.expander) {
      const extendedWords = words.slice(0);
      expand(words, options.expander, (position, item) => {
        extendedWords.splice(position, 0, item);
      });
      words = extendedWords;
    }

    if (options.wordexpander) {
      const expandedWords = [];
      words.forEach(word => {
        let expandedWord = word;
        expand(word, options.wordexpander, (position, item) => {
          expandedWord = `${expandedWord.substring(0, position)}${item}${expandedWord.substring(
            position
          )}`;
        });
        expandedWords.push(expandedWord);
      });
      words = expandedWords;
    }

    if (options.accents) {
      const accentedWords = [];
      words.forEach(word => {
        word = Array.from(word)
          .map(char => {
            console.log(char);
            return mapping[char] ? mapping[char] : char;
          })
          .join('');
        accentedWords.push(word);
      });
      words = accentedWords;
    }

    text = words.join(' ');
  }
  return text;
}

/**
 * Walk through parsed AST.
 *
 * @param {Object} node parsed AST.
 * @param {Object[]} parts List of text parts.
 */
function walkAST(node, parts) {
  switch (node.type) {
    case 'messageTextElement':
      // Hashtag is a key word
      const hash = node.value.split('#');
      if (hash.length > 1) {
        hash.forEach(part => {
          parts.push({ token: false, text: part });
          parts.push({ token: true, text: '#' });
        });
        parts.pop();
      } else {
        parts.push({ token: false, text: node.value });
      }
      break;
    case 'messageFormatPattern':
      node.elements.forEach(subnode => walkAST(subnode, parts));
      break;
    case 'argumentElement':
      parts.push({ token: true, text: `{${node.id}` });
      if (node.format) {
        walkAST(node.format, parts);
      }
      parts.push({ token: true, text: '}' });
      break;
    case 'pluralFormat':
      parts.push({
        token: true,
        text: `, ${node.ordinal ? 'selectordinal' : 'plural'},${node.offset
          ? ` offset:${node.offset}`
          : ''}`,
      });
      node.options.forEach(subnode => walkAST(subnode, parts));
      break;
    case 'selectFormat':
      parts.push({ token: true, text: `, select,` });
      node.options.forEach(subnode => walkAST(subnode, parts));
      break;
    case 'optionalFormatPattern':
      parts.push({ token: true, text: ` ${node.selector} {` });
      walkAST(node.value, parts);
      parts.push({ token: true, text: '}' });
      break;
    case 'dateFormat':
    case 'numberFormat':
    case 'timeFormat':
      parts.push({
        token: true,
        text: `, ${node.type.substring(0, node.type.length - 'Format'.length)}${node.style
          ? `, ${node.style}`
          : ''}`,
      });
      break;
  }
}

/**
 * Generates pseudo text.
 *
 * @param {string} text Input text.
 * @param {GeneratorOptions} options Generator options
 * @returns {string} Pseudo generated text
 */
function toPseudoText(text, options, messageParser) {
  let result = text;
  if (options) {
    let message = undefined;
    try {
      message = messageParser.parse(text);
    } catch (err) {
      if (options.forceException) {
        throw err;
      }
    }

    const parts = [];
    if (message) {
      walkAST(message, parts, options);
    } else {
      parts.push({ text });
    }

    for (let index = 0; index < parts.length; index++) {
      if (!parts[index].token && parts[index].text !== ' ') {
        // Text part can start or end with space
        const startsFromSpace = parts[index].text[0] === ' ';
        const endsWithSpace = parts[index].text[parts[index].text.length - 1] === ' ';

        parts[index].text = `${startsFromSpace ? ' ' : ''}${transformSentences(
          parts[index].text.trim(),
          options
        )}${endsWithSpace ? ' ' : ''}`;
      }
    }

    if (options.exclamations) {
      parts.splice(0, 0, { text: '!!! ' });
      parts.push({ text: ' !!!' });
    }

    if (options.brackets) {
      parts.splice(0, 0, { text: '[ ' });
      parts.push({ text: ' ]' });
    }

    result = parts.map(part => part.text).join('');

    if (options.rightToLeft) {
      const RLO = '\u202e';
      const PDF = '\u202c';
      const RLM = '\u200F';
      result = RLM + RLO + result + PDF + RLM;
    }
  }
  return result;
}

export function toFakeRTL(text) {
  return toPseudoText(
    text,
    {
      accents: true,
      rightToLeft: true,
    },
    IntlMessageFormatParser
  );
}
