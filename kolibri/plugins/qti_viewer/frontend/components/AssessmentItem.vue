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
  import { QTIVariable } from '../utils/qti/declarations';
  import ChoiceInteraction from './interactions/ChoiceInteraction.vue';
  import Prompt from './Prompt.vue';
  import SimpleChoice from './interactions/SimpleChoice.vue';
  import TextEntryInteraction from './interactions/TextEntryInteraction.vue';

  /**
   * Extract QTI declarations of a specific type from an XML document
   * @param {Document} xmlDocument - The QTI XML document
   * @param {string} declarationType - 'response', 'outcome', or 'context'
   * @param {Function} interactionHandler - a function that is called when a variable value is set
   * @param {Ref{Object}} injectedAnswerState - a computed ref that contains any injected answers
   * @returns {Object} Map of identifier -> QTIVariable
   */
  function getQTIDeclarations(xmlDocument, declarationType, interactionHander) {
    const declarations = {};

    const selector = `qti-${declarationType}-declaration`;

    const nodes = xmlDocument.querySelectorAll(selector);

    for (const node of nodes) {
      const variable = new QTIVariable(node, interactionHander);
      declarations[variable.identifier] = variable;
    }
    return declarations;
  }

  function clearObject(obj) {
    for (const key in obj) {
      delete obj[key];
    }
  }

  const SafeHTML = createSafeHTML({
    [ChoiceInteraction.tag]: ChoiceInteraction,
    [Prompt.tag]: Prompt,
    [SimpleChoice.tag]: SimpleChoice,
    [TextEntryInteraction.tag]: TextEntryInteraction,
  });

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

      const responses = {};

      function setFromAnswerState() {
        for (const key in responses) {
          if (injectedAnswerState.value[key]) {
            responses[key].value = injectedAnswerState.value[key];
          } else {
            responses[key].reset();
          }
        }
      }

      // Currently this only handles response variable declarations,
      // as that is all we need for survey functionality.
      // Extract response declarations
      function setResponseDeclarations() {
        clearObject(responses);
        Object.assign(responses, getQTIDeclarations(props.xmlDoc, 'response', interaction));
        setFromAnswerState();
      }

      registerCheckAnswer(() => {
        const answerState = {};
        for (const key in responses) {
          answerState[key] = cloneDeep(responses[key].value);
        }
        // Eventually this will come more generally from processing context declarations
        // but for now store this as the only context that we handle
        answerState['QTI_CONTEXT'] = cloneDeep(QTI_CONTEXT.value);
        return {
          correct: 1,
          answerState,
        };
      });

      provide('responses', responses);

      watch(() => props.xmlDoc, setResponseDeclarations);
      watch(() => injectedAnswerState.value, setFromAnswerState);
      setResponseDeclarations();

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
