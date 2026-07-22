import InlineChoiceInteraction from '../components/interactions/InlineChoiceInteraction.vue';
import { answerGuideStrings } from '../components/AnswerGuide.vue';

// Guides for inlines only, block interactions handle their own
// Each entry: { tag, guide? } where `guide` (optional) takes the number of gaps that
// interaction contributes to the passage — the guide wording is pluralised on it — and
// returns the translated string to hoist above the passage when that interaction is present.
const INLINE_INTERACTIONS = [
  {
    tag: InlineChoiceInteraction.tag,
    guide: count => answerGuideStrings.inlineChoice$({ count }),
  },
];

// A single selector matching every inline gap, so gaps are numbered across interaction types
const GAP_SELECTOR = INLINE_INTERACTIONS.map(interaction => interaction.tag).join(',');

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
  return clone.innerHTML;
}
