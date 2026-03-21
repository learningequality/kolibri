<template>

  <div>
    <SafeHTML
      v-if="itemBody"
      :html="itemBodyMarkup"
    />
  </div>

</template>


<script>

  import { computed, inject, provide, watch } from 'vue';
  import cloneDeep from 'lodash/cloneDeep';
  import { createSafeHTML } from 'kolibri-common/components/SafeHTML';
  import { useQTIContext } from '../composables/useQTIContext';
  import ChoiceInteraction from './interactions/ChoiceInteraction.vue';
  import Prompt from './Prompt.vue';
  import SimpleChoice from './interactions/SimpleChoice.vue';
  import TextEntryInteraction from './interactions/TextEntryInteraction.vue';
  import OrderInteraction from './interactions/OrderInteraction.vue';

  const SafeHTML = createSafeHTML({
    [ChoiceInteraction.tag]: ChoiceInteraction,
    [Prompt.tag]: Prompt,
    [SimpleChoice.tag]: SimpleChoice,
    [TextEntryInteraction.tag]: TextEntryInteraction,
    [OrderInteraction.tag]: OrderInteraction,
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
