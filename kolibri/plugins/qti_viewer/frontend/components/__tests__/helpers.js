/* global jest */
import { render } from '@testing-library/vue';
import { computed, ref } from 'vue';
import { parseXML } from '../../utils/xml';
import AssessmentItem from '../AssessmentItem.vue';

export function renderAssessmentItem(xml, options = {}) {
  const xmlDoc = parseXML(xml);
  const answerStateRef = ref(options.answerState || {});
  const interactiveRef = ref(options.interactive !== undefined ? options.interactive : true);

  let _checkAnswer = () => {
    throw new Error('No AssessmentItem has registered a checkAnswer handler');
  };

  const interactionFn = jest.fn();

  const renderResult = render(AssessmentItem, {
    props: { xmlDoc },
    provide: {
      handlers: {
        interaction: interactionFn,
        registerCheckAnswer: fn => {
          _checkAnswer = fn;
        },
      },
      QTI_CONTEXT: computed(() => ({
        candidateIdentifier: options.candidateIdentifier || 'test-candidate-001',
        testIdentifier: 'test-assessment',
        environmentIdentifier: 'test-env',
      })),
      answerState: computed(() => answerStateRef.value),
      interactive: computed(() => interactiveRef.value),
    },
  });

  return {
    ...renderResult,
    setAnswerState(state) {
      answerStateRef.value = state;
    },
    setInteractive(value) {
      interactiveRef.value = value;
    },
    checkAnswer() {
      return _checkAnswer();
    },
    interactionFn,
  };
}
