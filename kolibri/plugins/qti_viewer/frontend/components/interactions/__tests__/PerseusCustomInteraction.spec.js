import { render, waitFor } from '@testing-library/vue';
import { computed, nextTick, ref } from 'vue';
import PerseusCustomInteraction from '../PerseusCustomInteraction.vue';

const ITEM_PATH = 'perseus/q.json';

function perseusItem(path, content) {
  return {
    [path]: {
      perseusItemString: content,
      packageFiles: { 'perseus/images/a.png': 'blob:a' },
      sourceId: `qti-perseus:${path}`,
    },
  };
}

// Stands in for the nested Perseus renderer, counting how often it is reseeded.
function makeViewerStub(capture, checkAnswer) {
  return {
    name: 'ContentViewer',
    props: ['itemData', 'interactive', 'answerState', 'preset'],
    created() {
      capture.viewer = this;
      capture.itemData = this.itemData;
      capture.preset = this.preset;
      capture.interactive = this.interactive;
      capture.answerState = this.answerState;
      capture.reseeds = 0;
    },
    watch: {
      itemData(newItemData) {
        capture.itemData = newItemData;
      },
      answerState(newState) {
        capture.answerState = newState;
        capture.reseeds += 1;
      },
    },
    methods: checkAnswer ? { checkAnswer } : {},
    template: '<div data-testid="content-viewer" />',
  };
}

function renderInteraction(props, { perseusItems, responses, answerState, checkAnswer } = {}) {
  const capture = {};
  const result = render(PerseusCustomInteraction, {
    props,
    provide: {
      perseusItems: computed(() => perseusItems || {}),
      answerState: computed(() => answerState || {}),
      responses: computed(() => responses || {}),
      interactive: computed(() => true),
      handlers: { interaction: jest.fn() },
    },
    // eslint-disable-next-line kolibri/tests-no-stubs
    stubs: {
      ContentViewer: makeViewerStub(capture, checkAnswer),
    },
  });
  return { ...result, capture };
}

describe('PerseusCustomInteraction', () => {
  it('renders the item the viewer extracted for its declared path', () => {
    const items = perseusItem(ITEM_PATH, '{"question":{"content":"a question"}}');

    const { capture } = renderInteraction(
      { dataPerseusPath: ITEM_PATH, responseIdentifier: 'RESPONSE' },
      { perseusItems: items },
    );

    expect(capture.preset).toBe('exercise');
    expect(capture.itemData).toEqual(items[ITEM_PATH]);
  });

  it('renders nothing when the viewer has no item for its declared path', () => {
    const { container } = renderInteraction(
      { dataPerseusPath: 'perseus/absent.json', responseIdentifier: 'RESPONSE' },
      { perseusItems: {} },
    );

    expect(container.querySelector('[data-testid="content-viewer"]')).toBeNull();
  });

  it('renders the new item when the item path changes', async () => {
    const items = {
      ...perseusItem('perseus/one.json', '{"question":{"content":"one"}}'),
      ...perseusItem('perseus/two.json', '{"question":{"content":"two"}}'),
    };

    const { capture, updateProps } = renderInteraction(
      { dataPerseusPath: 'perseus/one.json', responseIdentifier: 'RESPONSE' },
      { perseusItems: items },
    );

    expect(capture.itemData.perseusItemString).toContain('one');

    await updateProps({
      dataPerseusPath: 'perseus/two.json',
      responseIdentifier: 'RESPONSE',
    });

    expect(capture.itemData.perseusItemString).toContain('two');
  });

  it('seeds the renderer from the answer state the viewer was given, not its own grades', async () => {
    const savedAnswerState = { userInput: { 'radio 1': { choicesSelected: [true] } } };
    const responses = { RESPONSE: ref(null) };

    const { capture } = renderInteraction(
      { dataPerseusPath: ITEM_PATH, responseIdentifier: 'RESPONSE' },
      {
        perseusItems: perseusItem(ITEM_PATH, '{"question":{"content":""}}'),
        answerState: { RESPONSE: { correct: true, answerState: savedAnswerState } },
        responses,
        checkAnswer: () => ({
          correct: false,
          simpleAnswer: 'graded',
          answerState: { userInput: {} },
        }),
      },
    );

    expect(capture.answerState).toEqual(savedAnswerState);

    capture.viewer.$emit('interaction');
    await waitFor(() => expect(responses.RESPONSE.value).not.toBeNull());
    await nextTick();

    expect(responses.RESPONSE.value.answerState).toEqual({ userInput: {} });
    expect(capture.reseeds).toBe(0);
    expect(capture.answerState).toEqual(savedAnswerState);
  });

  it('grades on interaction and breaks the check-answer feedback loop', async () => {
    const responses = { RESPONSE: { value: null } };
    let checkAnswerCalls = 0;

    const { capture } = renderInteraction(
      { dataPerseusPath: ITEM_PATH, responseIdentifier: 'RESPONSE' },
      {
        perseusItems: perseusItem(ITEM_PATH, '{"question":{"content":""}}'),
        responses,
        checkAnswer() {
          checkAnswerCalls += 1;
          // Scoring itself emits an interaction, as a graphie re-render does.
          this.$emit('interaction');
          return { correct: true, simpleAnswer: '', answerState: { userInput: {} } };
        },
      },
    );

    capture.viewer.$emit('interaction');
    await waitFor(() => expect(responses.RESPONSE.value).not.toBeNull());
    await nextTick();

    expect(checkAnswerCalls).toBe(1);
    expect(responses.RESPONSE.value).toEqual({
      correct: true,
      simpleAnswer: '',
      answerState: { userInput: {} },
    });
  });

  it('grades the answer Perseus commits after the interaction event', async () => {
    // Perseus emits `interaction` before React has committed the new user input.
    const responses = { RESPONSE: { value: null } };
    let committedAnswer = 'previous answer';

    const { capture } = renderInteraction(
      { dataPerseusPath: ITEM_PATH, responseIdentifier: 'RESPONSE' },
      {
        perseusItems: perseusItem(ITEM_PATH, '{"question":{"content":""}}'),
        responses,
        checkAnswer: () => ({ correct: true, simpleAnswer: committedAnswer, answerState: {} }),
      },
    );

    capture.viewer.$emit('interaction');
    committedAnswer = 'current answer';

    await waitFor(() => expect(responses.RESPONSE.value).not.toBeNull());
    expect(responses.RESPONSE.value.simpleAnswer).toBe('current answer');
  });
});
