import { computed, nextTick, ref } from 'vue';
import { render, waitFor } from '@testing-library/vue';
import AssessmentItem from '../AssessmentItem.vue';
import { parseXML } from '../../utils/xml.js';

// The wrapper item learningequality/studio#6047 publishes around a Perseus item.
const WRAPPER_XML = `
  <qti-assessment-item>
    <qti-response-declaration identifier="RESPONSE" cardinality="record" />
    <qti-outcome-declaration identifier="SCORE" cardinality="single" base-type="float">
      <qti-default-value><qti-value>0</qti-value></qti-default-value>
    </qti-outcome-declaration>
    <qti-item-body>
      <qti-custom-interaction response-identifier="RESPONSE" data-type="perseus"
        data-perseus-path="perseus/q.json" />
    </qti-item-body>
    <qti-response-processing>
      <qti-response-condition>
        <qti-response-if>
          <qti-field-value field-identifier="correct">
            <qti-variable identifier="RESPONSE" />
          </qti-field-value>
          <qti-set-outcome-value identifier="SCORE">
            <qti-base-value base-type="float">1</qti-base-value>
          </qti-set-outcome-value>
        </qti-response-if>
        <qti-response-else>
          <qti-set-outcome-value identifier="SCORE">
            <qti-base-value base-type="float">0</qti-base-value>
          </qti-set-outcome-value>
        </qti-response-else>
      </qti-response-condition>
    </qti-response-processing>
  </qti-assessment-item>`;

function contentViewerStub(checkAnswerResult) {
  return {
    name: 'ContentViewer',
    props: ['itemData', 'interactive', 'answerState', 'preset'],
    mounted() {
      this.$nextTick(() => this.$emit('interaction'));
    },
    methods: {
      checkAnswer() {
        return checkAnswerResult;
      },
    },
    template: '<div data-testid="content-viewer" />',
  };
}

async function renderWrapper(checkAnswerResult) {
  const xmlDoc = parseXML(WRAPPER_XML);
  let checkAnswerFn = null;

  const perseusItems = {
    'perseus/q.json': {
      perseusItemString: '{"question":{"content":""}}',
      packageFiles: {},
      sourceId: 'qti-perseus:perseus/q.json',
    },
  };

  const { container } = render(AssessmentItem, {
    props: { xmlDoc },
    provide: {
      perseusItems: computed(() => perseusItems),
      handlers: {
        interaction: jest.fn(),
        registerCheckAnswer: fn => {
          checkAnswerFn = fn;
        },
      },
      QTI_CONTEXT: computed(() => ({ candidateIdentifier: 'test-user' })),
      answerState: ref({}),
      interactive: computed(() => true),
    },
    // eslint-disable-next-line kolibri/tests-no-stubs
    stubs: {
      ContentViewer: contentViewerStub(checkAnswerResult),
    },
  });

  expect(container.querySelector('[data-testid="content-viewer"]')).toBeTruthy();
  await waitFor(() => expect(checkAnswerFn().answerState.RESPONSE?.correct).not.toBeUndefined());
  await nextTick();

  return { checkAnswer: () => checkAnswerFn() };
}

describe('Perseus-in-QTI grading', () => {
  it.each`
    correct  | score
    ${true}  | ${1}
    ${false} | ${0}
  `(
    'commits correct=$correct to the RESPONSE record so SCORE=$score',
    async ({ correct, score }) => {
      const { checkAnswer } = await renderWrapper({
        correct,
        simpleAnswer: '',
        answerState: { userInput: {} },
      });

      const result = checkAnswer();

      expect(result.answerState.RESPONSE.correct).toBe(correct);
      expect(result.outcomes.SCORE).toBe(score);
    },
  );
});
