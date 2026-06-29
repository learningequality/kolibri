import { computed, unref } from 'vue';
import { createTranslator } from 'kolibri/utils/i18n';

export const answerGuideStrings = createTranslator('AnswerGuideStrings', {
  chooseOne: {
    message: 'Choose 1 answer:',
    context: 'Tells the learner to select exactly one answer (single-selection choice interaction)',
  },
  chooseAny: {
    message: 'Choose all answers that apply:',
    context:
      'Tells the learner they may select any number of answers (multi-selection choice interaction)',
  },
  order: {
    message: 'Drag to reorder, or use arrow buttons for keyboard navigation:',
    context: 'Tells the learner to order the answers (order interaction)',
  },
  // add more for the other interaction types
});

const ANSWER_GUIDES = {
  'qti-choice-interaction-single': answerGuideStrings.chooseOne$(),
  'qti-choice-interaction-multiple': answerGuideStrings.chooseAny$(),
  'qti-order-interaction': answerGuideStrings.order$(),
};

/**
 * Looks up the constant, learner-facing answer-guide text for a given key.
 *
 * @param {string} key - e.g. 'qti-choice-interaction-single',
 *   or just the interaction tag itself for types with one fixed message
 *   (e.g. 'qti-gap-match-interaction')
 */
export default function useAnswerGuide(key) {
  return computed(() => ANSWER_GUIDES[unref(key)] || '');
}
