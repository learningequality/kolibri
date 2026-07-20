import InlineChoiceInteraction from '../components/interactions/InlineChoiceInteraction.vue';
import { answerGuideStrings } from '../components/AnswerGuide.vue';

// Guides for inlines only, block interactions handle their own
const INLINE_INTERACTION_GUIDES = [
  { tag: InlineChoiceInteraction.tag, text: () => answerGuideStrings.inlineChoice$() },
];

/**
 * Determine the guide(s) to render once above an item body's passage, based on the inline
 * interactions it contains.
 * @param {Element|null} itemBodyNode - The qti-item-body element (or null).
 * @returns {string[]} Translated guide strings, in table order (empty when none apply).
 */
export function getItemBodyGuides(itemBodyNode) {
  if (!itemBodyNode) {
    return [];
  }
  return INLINE_INTERACTION_GUIDES.filter(guide => itemBodyNode.querySelector(guide.tag)).map(
    guide => guide.text(),
  );
}
