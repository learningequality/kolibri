<template>

  <div>
    <template v-if="itemBody">
      <AnswerGuide
        v-for="text in guides"
        :key="text"
        :text="text"
      />
      <SafeHTML
        :class="{ 'qti-passage': guides.length }"
        :style="passageStyles"
        :html="itemBodyMarkup"
      />
      <NumericKeypad :lang="lang" />
    </template>
  </div>

</template>


<script>

  import { computed, inject, provide, ref, watch } from 'vue';
  import cloneDeep from 'lodash/cloneDeep';
  import { createSafeHTML } from 'kolibri-common/components/SafeHTML';
  import { themeTokens } from 'kolibri-design-system/lib/styles/theme';
  import useKeypad from 'kolibri-common/composables/useKeypad';
  import NumericKeypad from 'kolibri-common/components/NumericKeypad';
  import { useQTIContext } from '../composables/useQTIContext';
  import { getItemBodyGuides, numberPassageGaps } from '../utils/itemBodyGuidance';
  import AnswerGuide from './AnswerGuide.vue';
  import ChoiceInteraction from './interactions/ChoiceInteraction.vue';
  import Prompt from './Prompt.vue';
  import SimpleChoice from './interactions/SimpleChoice.vue';
  import TextEntryInteraction from './interactions/TextEntryInteraction.vue';
  import OrderInteraction from './interactions/OrderInteraction.vue';
  import InlineChoiceInteraction from './interactions/InlineChoiceInteraction.vue';
  import InlineChoice from './interactions/InlineChoice.vue';
  import CustomInteraction from './interactions/CustomInteraction.vue';
  import AssociateInteraction from './interactions/AssociateInteraction.vue';
  import SimpleAssociableChoice from './interactions/SimpleAssociableChoice.vue';
  import MatchInteraction from './interactions/MatchInteraction.vue';
  import SimpleMatchSet from './interactions/SimpleMatchSet.vue';
  import GapMatchInteraction from './interactions/GapMatchInteraction.vue';
  import Gap from './interactions/Gap.vue';
  import GapText from './interactions/GapText.vue';
  import GapImg from './interactions/GapImg.vue';

  const $themeTokens = themeTokens();

  const SafeHTML = createSafeHTML({
    [ChoiceInteraction.tag]: ChoiceInteraction,
    [Prompt.tag]: Prompt,
    [SimpleChoice.tag]: SimpleChoice,
    [TextEntryInteraction.tag]: TextEntryInteraction,
    [OrderInteraction.tag]: OrderInteraction,
    [InlineChoiceInteraction.tag]: InlineChoiceInteraction,
    [InlineChoice.tag]: InlineChoice,
    [CustomInteraction.tag]: CustomInteraction,
    [AssociateInteraction.tag]: AssociateInteraction,
    [SimpleAssociableChoice.tag]: SimpleAssociableChoice,
    [MatchInteraction.tag]: MatchInteraction,
    [SimpleMatchSet.tag]: SimpleMatchSet,
    [GapMatchInteraction.tag]: GapMatchInteraction,
    [Gap.tag]: Gap,
    [GapText.tag]: GapText,
    [GapImg.tag]: GapImg,
  });

  /** @typedef {import('../utils/qti/values.js').QTIValue} QTIValue */

  /**
   * @typedef {object} CheckAnswerResult
   * @property {{[key: string]: QTIValue}} outcomes
   * Snapshot of current outcome variable values keyed by identifier, e.g.
   * `{ SCORE: 1 }`. Written by response processing during `checkAnswer`.
   * @property {{[key: string]: QTIValue|object}} answerState
   * Snapshot of response variable values plus a `QTI_CONTEXT` entry
   * containing the active QTI context record. Shape suitable for persisting
   * and re-injecting via the `answerState` prop on a later mount.
   */

  export default {
    name: 'AssessmentItem',
    components: {
      AnswerGuide,
      SafeHTML,
      NumericKeypad,
    },
    setup(props) {
      const itemBody = computed(() => {
        return props.xmlDoc.querySelector('qti-item-body');
      });

      // Process item body for display. Inline gaps are annotated with their passage position so
      // each can render a distinct accessible name; item bodies without gaps pass through as-is.
      const itemBodyMarkup = computed(() => numberPassageGaps(itemBody.value));

      // Guides shown once above the passage for inline interactions that cannot render their
      // own block-level guide
      const guides = computed(() => getItemBodyGuides(itemBody.value));
      const passageStyles = computed(() =>
        guides.value.length
          ? { borderColor: $themeTokens.fineLine, color: $themeTokens.text }
          : null,
      );

      const { interaction, registerCheckAnswer } = inject('handlers');
      const QTI_CONTEXT = inject('QTI_CONTEXT');
      const injectedAnswerState = inject('answerState');

      // Use the QTI context composable for declaration management and response processing.
      // The interaction callback is called when any response variable value changes,
      // notifying the parent (QTIViewer) that the user has interacted.
      const qtiContext = useQTIContext(props, {
        onValueChange: interaction,
      });

      const { responses, processResponses } = qtiContext;

      const lang = inject('lang', ref(null));
      // Hosts the shared keypad state
      useKeypad();

      function setFromAnswerState() {
        for (const [id, variable] of Object.entries(responses.value)) {
          if (id in injectedAnswerState.value && injectedAnswerState.value[id] != null) {
            variable.value = injectedAnswerState.value[id];
          } else {
            variable.reset();
          }
        }
      }

      registerCheckAnswer(() => {
        // Run response processing to compute outcome values (e.g., SCORE)
        processResponses();

        const answerState = {};
        for (const [id, variable] of Object.entries(responses.value)) {
          answerState[id] = cloneDeep(variable.value);
        }
        // Eventually this will come more generally from processing context
        // declarations, but for now QTI_CONTEXT is the only context we store.
        answerState['QTI_CONTEXT'] = cloneDeep(QTI_CONTEXT.value);

        // Extract outcome values for the caller
        const outcomes = {};
        for (const [id, variable] of Object.entries(qtiContext.outcomes.value)) {
          outcomes[id] = variable.value;
        }

        return {
          outcomes,
          answerState,
        };
      });

      provide('responses', responses);

      watch(
        () => props.xmlDoc,
        () => {
          // responses computed ref auto-updates when xmlDoc changes;
          // sync from answer state after rebuild
          setFromAnswerState();
        },
      );
      watch(() => injectedAnswerState.value, setFromAnswerState);
      setFromAnswerState();

      return {
        itemBody,
        itemBodyMarkup,
        guides,
        passageStyles,
        lang,
      };
    },
    props: {
      xmlDoc: {
        type: Document,
        required: true,
      },
    },
  };

</script>


<style lang="scss" scoped>

  .qti-passage {
    padding: 1rem 1.125rem;
    line-height: 2.25;
    border-style: solid;
    border-width: 1px;
    border-radius: 8px;
  }

</style>
