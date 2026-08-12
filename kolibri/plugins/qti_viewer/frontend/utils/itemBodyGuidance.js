import InlineChoiceInteraction from '../components/interactions/InlineChoiceInteraction.vue';
import TextEntryInteraction from '../components/interactions/TextEntryInteraction.vue';
import { answerGuideStrings } from '../components/AnswerGuide.vue';

// Guides for inlines only, block interactions handle their own
// Each entry: { tag, guide?, numbered? } where `guide` (optional) takes the number of gaps that
// interaction contributes to the passage — the guide wording is pluralised on it — and
// returns the translated string to hoist above the passage when that interaction is present.
// `numbered` opts the interaction into passage gap numbering, for gaps that name their own
// position to the learner.
const INLINE_INTERACTIONS = [
  {
    tag: InlineChoiceInteraction.tag,
    guide: count => answerGuideStrings.inlineChoice$({ count }),
    numbered: true,
  },
  {
    tag: TextEntryInteraction.tag,
    guide: () => answerGuideStrings.shortAnswer$(),
  },
];

// A single selector matching every numbered gap, so gaps are numbered across interaction types
const GAP_SELECTOR = INLINE_INTERACTIONS.filter(interaction => interaction.numbered)
  .map(interaction => interaction.tag)
  .join(',');

/**
 * The guide(s) to render once above an item body's passage, based on the inline interactions
 * it contains.
 * @param {Element|null} itemBodyNode - The qti-item-body element (or null).
 * @returns {string[]} Translated guide strings, in registry order (empty when none apply).
 */
export function getItemBodyGuides(itemBodyNode) {
  if (!itemBodyNode) {
    return [];
  }
  return INLINE_INTERACTIONS.filter(
    interaction => interaction.guide && itemBodyNode.querySelector(interaction.tag),
  ).map(interaction => interaction.guide(itemBodyNode.querySelectorAll(interaction.tag).length));
}

/**
 * Serialize an XML element's children as HTML.
 *
 * The item body is parsed as XML but the markup we return is re-parsed by SafeHTML with the
 * HTML parser. XML serialization self-closes any empty element — `<qti-text-entry-interaction/>`
 * — and to the HTML parser that is a start tag with no end, so everything after it in the
 * passage is swallowed into the gap as child content and lost. Round-tripping through an HTML
 * document emits explicit end tags for those elements instead, keeping the sentence around an
 * inline gap intact.
 * @param {Element} node - The element whose children to serialize.
 * @returns {string} The children as HTML markup.
 */
function serializeChildrenAsHTML(node) {
  const htmlDoc = document.implementation.createHTMLDocument('');
  const imported = htmlDoc.importNode(node, true);
  return imported.innerHTML;
}

/**
 * Return the item body's markup with each inline gap tagged with its 1-based position
 * (data-gap-number) and the total number of gaps in the passage (data-gap-count), numbered
 * across all inline interaction types in document order. Each gap needs this to render a
 * distinct accessible name ("gap 2 of 3"), which it cannot derive on its own since gaps are
 * rendered independently from the passage markup. Item bodies with no inline gaps are returned
 * unchanged.
 * @param {Element|null} itemBodyNode - The qti-item-body element (or null).
 * @returns {string} The (possibly annotated) item body inner markup.
 */
export function numberPassageGaps(itemBodyNode) {
  if (!itemBodyNode) {
    return '';
  }
  // Clone so we annotate a throwaway copy rather than mutating the parsed document.
  const clone = itemBodyNode.cloneNode(true);
  const gaps = clone.querySelectorAll(GAP_SELECTOR);
  gaps.forEach((gap, index) => {
    gap.setAttribute('data-gap-number', String(index + 1));
    gap.setAttribute('data-gap-count', String(gaps.length));
  });
  return serializeChildrenAsHTML(clone);
}
