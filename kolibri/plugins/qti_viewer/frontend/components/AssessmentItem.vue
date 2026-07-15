<template>

  <div>
    <template v-if="itemBody">
      <AnswerGuide
        v-if="hasInlineChoice"
        :text="inlineChoiceGuideText"
      />
      <div
        v-if="hasInlineChoice"
        class="qti-passage"
        :style="passageStyles"
      >
        <SafeHTML :html="itemBodyMarkup" />
      </div>
      <SafeHTML
        v-else
        :html="itemBodyMarkup"
      />
    </template>
  </div>

</template>


<script>

  import { computed, inject, provide, watch } from 'vue';
  import cloneDeep from 'lodash/cloneDeep';
  import { createSafeHTML } from 'kolibri-common/components/SafeHTML';
  import { useQTIContext } from '../composables/useQTIContext';
  import { themeTokens } from 'kolibri-design-system/lib/styles/theme';
  import { QTIVariable } from '../utils/qti/declarations';
  import AnswerGuide, { answerGuideStrings } from './AnswerGuide.vue';
  import ChoiceInteraction from './interactions/ChoiceInteraction.vue';
  import Prompt from './Prompt.vue';
  import SimpleChoice from './interactions/SimpleChoice.vue';
  import TextEntryInteraction from './interactions/TextEntryInteraction.vue';
  import OrderInteraction from './interactions/OrderInteraction.vue';
  import InlineChoiceInteraction from './interactions/InlineChoiceInteraction.vue';
  import InlineChoice from './interactions/InlineChoice.vue';

  /**
   * Extract QTI declarations of a specific type from an XML document.
   * @param {Document} xmlDocument - The QTI XML document.
   * @param {string} declarationType - 'response', 'outcome', or 'context'.
   * @param {Function} interactionHandler - A function called when a variable value is set.
   * @returns {object} Map of identifier to QTIVariable.
   */
  function getQTIDeclarations(xmlDocument, declarationType, interactionHandler) {
    const declarations = {};

    const selector = `qti-${declarationType}-declaration`;

    const nodes = xmlDocument.querySelectorAll(selector);

    for (const node of nodes) {
      const variable = new QTIVariable(node, interactionHandler);
      declarations[variable.identifier] = variable;
    }
    return declarations;
  }

  function clearObject(obj) {
    for (const key in obj) {
      delete obj[key];
    }
  }

  const $themeTokens = themeTokens();

  const SafeHTML = createSafeHTML({
    [ChoiceInteraction.tag]: ChoiceInteraction,
    [Prompt.tag]: Prompt,
    [SimpleChoice.tag]: SimpleChoice,
    [TextEntryInteraction.tag]: TextEntryInteraction,
    [OrderInteraction.tag]: OrderInteraction,
    [InlineChoiceInteraction.tag]: InlineChoiceInteraction,
    [InlineChoice.tag]: InlineChoice,
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
    },
    setup(props) {
      const itemBody = computed(() => {
        return props.xmlDoc.querySelector('qti-item-body');
      });

      // Process item body for display
      const itemBodyMarkup = computed(() => {
        return itemBody.value?.innerHTML || '';
      });

      // Inline-choice gaps are inline within the passage, so a single guide is shown once
      // above the whole passage rather than per gap.
      const hasInlineChoice = computed(() =>
        Boolean(itemBody.value?.querySelector('qti-inline-choice-interaction')),
      );
      const inlineChoiceGuideText = computed(() => answerGuideStrings.inlineChoice$());
      const passageStyles = computed(() => ({
        borderColor: $themeTokens.fineLine,
        color: $themeTokens.text,
      }));

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
        hasInlineChoice,
        inlineChoiceGuideText,
        passageStyles,
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
