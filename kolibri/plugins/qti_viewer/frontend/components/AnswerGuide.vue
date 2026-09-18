<template>

  <p
    v-if="text"
    class="qti-selection-instructions"
    :style="instructionStyles"
  >
    {{ text }}
  </p>

</template>


<script>

  import { computed } from 'vue';
  import { themeTokens, themePalette } from 'kolibri-design-system/lib/styles/theme';
  import { createTranslator } from 'kolibri/utils/i18n';

  const $themeTokens = themeTokens();
  const $themePalette = themePalette();

  export const answerGuideStrings = createTranslator('AnswerGuideStrings', {
    chooseOne: {
      message: 'Choose 1 answer:',
      context:
        'Tells the learner to select exactly one answer (single-selection choice interaction)',
    },
    chooseAny: {
      message: 'Choose all answers that apply:',
      context:
        'Tells the learner they may select any number of answers (multi-selection choice interaction)',
    },
    order: {
      message: 'Drag to reorder, or use the up/down buttons for keyboard navigation:',
      context: 'Tells the learner how to reorder the answer choices',
    },
    orderKeyboard: {
      message: 'Use the right/left buttons to reorder:',
      context: 'Tells the learner how to reorder the answer choices using the keyboard',
    },
    inlineChoice: {
      message: 'Choose the best inline option for {count, plural, one {the} other {each}} gap.',
      context:
        'Tells the learner to complete the passage by choosing an option in each inline dropdown gap',
    },
    chooseThenTarget: {
      message: 'Choose a response, then choose a target.',
      context:
        'Tells the learner how to build each pair in a connect-pairs or match interaction: pick a response from the pool, then pick the answer slot to put it in',
    },
    shortAnswer: {
      message: 'Short answer only:',
      context: 'Tells the learner to type their answer in a text entry interaction',
    },
    gapMatch: {
      message: 'Choose a response, then choose a gap.',
      context:
        'Tells the learner how to fill each blank in a gap match question: pick a response from the pool, then pick the gap in the passage to put it in',
    },
  });

  export default {
    name: 'AnswerGuide',
    setup() {
      const instructionStyles = computed(() => ({
        backgroundColor: $themePalette.grey.v_100,
        borderColor: $themeTokens.fineLine,
        color: $themeTokens.text,
      }));

      return {
        instructionStyles,
      };
    },
    props: {
      text: {
        type: String,
        default: '',
      },
    },
  };

</script>


<style lang="scss" scoped>

  .qti-selection-instructions {
    padding: 0.75rem 1.125rem;
    margin: 0 0 0.5rem;
    font-weight: 700;
    border-style: solid;
    border-width: 1px;
    border-radius: 8px;
  }

</style>
