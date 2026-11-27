import { fireEvent, render, screen, waitFor, within } from '@testing-library/vue';
// eslint-disable-next-line import-x/named
import useContentViewer, { useContentViewerMock } from 'kolibri/composables/useContentViewer';
import { init } from '@khanacademy/perseus';
import perseusFixtures from '../../../qti_viewer/frontend/components/__fixtures__/perseus';
import sandboxFixtures from '../../../../../integration_testing/viewer_sandbox/frontend/__fixtures__/perseus';
import perseusTranslator from '../translator';
import PerseusRendererIndex from '../views/PerseusRendererIndex';

jest.mock('kolibri/composables/useContentViewer');

// PerseusRendererIndex imports Tex.js, which calls urls.static() at module load;
// that needs plugin URL data, absent in tests without a rendered Django template.
jest.mock('kolibri-plugin-data', () => ({
  __esModule: true,
  default: {
    urls: {
      __staticUrl: '/static/',
      __zipContentUrl: '/zipcontent/',
      __zipContentOrigin: 'http://localhost',
      __zipContentPort: '8000',
      prefix: '/',
      urls: {},
    },
  },
}));

// Perseus reads its widget registry when it migrates or renders an item, and
// only init() populates it (mirrors stateSerialization.spec.js:8).
init();

const OUTSIDE_BUTTON = 'Outside';
const LOCALPATH_TOKEN = '${☣ LOCALPATH}';

// A radio widget renders as plain HTML choices; input-number and friends pull in
// Perseus's keypad/MathInput subtree, which does not mount cleanly under jsdom.
function perseusItem(imageRef) {
  return {
    question: {
      content: `![an image](${imageRef})\n\n[[☃ radio 1]]`,
      images: {},
      widgets: {
        'radio 1': {
          type: 'radio',
          graded: true,
          options: {
            choices: [
              { content: 'First choice', correct: true },
              { content: 'Second choice', correct: false },
            ],
            randomize: false,
            multipleSelect: false,
            countChoices: false,
            displayCount: null,
            hasNoneOfTheAbove: false,
            deselectEnabled: false,
          },
          version: { major: 1, minor: 0 },
        },
      },
    },
    answerArea: {
      calculator: false,
      chi2Table: false,
      periodicTable: false,
      tTable: false,
      zTable: false,
    },
    itemDataVersion: { major: 0, minor: 1 },
    hints: [],
  };
}

function embellishedItemData({
  imageRef = `${LOCALPATH_TOKEN}/perseus/images/a.png`,
  packageFiles,
  sourceId,
}) {
  return { perseusItemString: JSON.stringify(perseusItem(imageRef)), packageFiles, sourceId };
}

async function mountRenderer(
  itemData,
  {
    showCorrectAnswer = false,
    answerState,
    interactive = true,
    onInteraction,
    showAnswerOnStart = false,
  } = {},
) {
  let instance = null;
  let registeredApi = null;
  const viewerProps = useContentViewerMock({
    itemData,
    interactive,
    showCorrectAnswer,
    answerState,
  });
  useContentViewer.mockImplementation(() => ({
    ...viewerProps,
    registerAssessmentApi: api => {
      registeredApi = api;
    },
  }));
  // Supplied by the plugin's content module, which mounting directly bypasses.
  PerseusRendererIndex.contentModule = { loadDirectionalCSS: () => Promise.resolve() };
  const Harness = {
    components: { PerseusRendererIndex },
    mounted() {
      instance = this.$refs.renderer;
    },
    methods: {
      onStartTracking() {
        if (showAnswerOnStart) viewerProps.showCorrectAnswer.value = true;
      },
      onInteraction() {
        onInteraction?.(registeredApi.checkAnswer());
      },
    },
    template: `<div><button>${OUTSIDE_BUTTON}</button><PerseusRendererIndex ref="renderer" @interaction="onInteraction" @startTracking="onStartTracking" /></div>`,
  };
  const utils = render(Harness);
  utils.getByRole('button', { name: OUTSIDE_BUTTON }).focus();
  await global.flushPromises();
  await global.flushPromises();
  return {
    instance: () => instance,
    api: () => registeredApi,
    setShowAnswer: value => {
      viewerProps.showCorrectAnswer.value = value;
    },
    setAnswerState: value => {
      viewerProps.answerState.value = value;
    },
    ...utils,
  };
}

describe('PerseusRendererIndex embellished itemData', () => {
  it('substitutes injected image URLs into the item, dropping LOCALPATH tokens', async () => {
    const itemData = embellishedItemData({
      packageFiles: { 'perseus/images/a.png': 'blob:injected-a' },
      sourceId: 'qti-perseus:perseus/q.json',
    });
    const { instance } = await mountRenderer(itemData);

    const content = instance().item.question.content;
    expect(content).toContain('blob:injected-a');
    expect(content).not.toContain(LOCALPATH_TOKEN);
  });

  it('matches package files forgivingly by basename', async () => {
    const itemData = embellishedItemData({
      packageFiles: { 'a.png': 'blob:by-basename' },
      sourceId: 'qti-perseus:perseus/basename.json',
    });
    const { instance } = await mountRenderer(itemData);

    expect(instance().item.question.content).toContain('blob:by-basename');
  });

  it("checks an injected item's answer without leaking resolved URLs", async () => {
    const itemData = embellishedItemData({
      packageFiles: { 'perseus/images/a.png': 'blob:injected-a' },
      sourceId: 'qti-perseus:perseus/answer.json',
    });
    const { api } = await mountRenderer(itemData);

    const result = api().checkAnswer();
    expect(result).not.toBeNull();
    expect(JSON.stringify(result.answerState)).not.toContain('blob:');
  });

  it('does not render or start tracking once unmounted before its stylesheet loads', async () => {
    let loadStylesheet;
    PerseusRendererIndex.contentModule = {
      loadDirectionalCSS: () => new Promise(resolve => (loadStylesheet = resolve)),
    };
    useContentViewer.mockImplementation(() => ({
      ...useContentViewerMock({ itemData: embellishedItemData({ sourceId: 'teardown' }) }),
      registerAssessmentApi: () => {},
    }));
    const onStartTracking = jest.fn();
    const { unmount } = render(PerseusRendererIndex, {
      listeners: { startTracking: onStartTracking },
    });
    unmount();
    const rejections = [];
    const onRejection = reason => rejections.push(reason);
    process.on('unhandledRejection', onRejection);
    try {
      loadStylesheet();
      await global.flushPromises();
      await new Promise(resolve => setTimeout(resolve, 0));
    } finally {
      process.off('unhandledRejection', onRejection);
    }
    expect(rejections).toEqual([]);
    expect(onStartTracking).not.toHaveBeenCalled();
  });
});

function renderedHintBodies(container) {
  return [...container.querySelectorAll('.perseus-hint-renderer > .perseus-renderer')].filter(
    body => body.querySelector('[data-perseus-paragraph-index] > *'),
  );
}

function embellishedFromFixture(fixture) {
  const packageFiles = Object.fromEntries(
    Object.entries(fixture.files).filter(([path]) => path !== fixture.perseusPath),
  );
  return {
    perseusItemString: fixture.files[fixture.perseusPath],
    packageFiles,
    sourceId: `qti-perseus:${fixture.perseusPath}`,
  };
}

describe('PerseusRendererIndex with fixture items', () => {
  // Perseus's graphie loader fetches each image's `-data.json` label file, which
  // jsdom cannot; its `parseDataFromJSONP` accepts an unwrapped JSON body.
  let originalFetch;
  beforeAll(() => {
    originalFetch = global.fetch;
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        text: () => Promise.resolve('{"range":[[0,10],[0,10]],"labels":[]}'),
      }),
    );
  });
  afterAll(() => {
    global.fetch = originalFetch;
  });

  const matchMedia = window.matchMedia;

  beforeEach(() => {
    window.matchMedia = () => ({
      matches: false,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      addListener: jest.fn(),
      removeListener: jest.fn(),
    });
  });

  afterEach(() => {
    window.matchMedia = matchMedia;
  });

  it('resolves web+graphie image refs from the injected map, dropping LOCALPATH', async () => {
    const itemData = embellishedFromFixture(perseusFixtures['perseus-classify-triangle']);
    const { instance, api } = await mountRenderer(itemData);

    const serializedItem = JSON.stringify(instance().item);
    expect(serializedItem).toContain('web+graphie:');
    expect(serializedItem).not.toContain(LOCALPATH_TOKEN);

    const result = api().checkAnswer();
    expect(result).not.toBeNull();
    expect(JSON.stringify(result.answerState)).not.toContain('data:');
  });

  it('renders each choice as a focusable control with an accessible name', async () => {
    const itemData = embellishedFromFixture(perseusFixtures['perseus-square-shape']);
    await mountRenderer(itemData);

    expect(screen.getAllByRole('group').length).toBeGreaterThan(0);
    const choices = screen.getAllByRole('listitem');
    expect(choices.length).toBeGreaterThanOrEqual(3);
    choices.forEach(choice => {
      const control = within(choice).getByRole('button');
      expect(control).toHaveAccessibleName();
      expect(control).not.toHaveAttribute('tabindex', '-1');
    });
  });

  it.each(sandboxFixtures)(
    'reveals a hint, solves, and restores an answer in read-only mode for $category',
    async fixture => {
      const { api, instance, container, setShowAnswer, setAnswerState } = await mountRenderer(
        { perseusItemString: fixture.item, packageFiles: fixture.files, sourceId: fixture.id },
        { interactive: false },
      );
      await waitFor(() => expect(api().checkAnswer()).not.toBeNull(), { timeout: 5000 });
      const blank = api().checkAnswer().answerState.userInput;
      expect(api().checkAnswer().correct).toBe(false);
      expect(instance().itemRenderer.props.apiOptions.readOnly).toBe(true);
      expect(renderedHintBodies(container)).toHaveLength(0);
      api().takeHint();
      await waitFor(() => expect(renderedHintBodies(container)).toHaveLength(1), {
        timeout: 5000,
      });

      setShowAnswer(true);
      await waitFor(() => expect(api().checkAnswer()?.correct).toBe(true), { timeout: 5000 });
      expect(renderedHintBodies(container)).toHaveLength(1);

      const solved = api().checkAnswer().answerState.userInput;
      setShowAnswer(false);
      await waitFor(() => expect(api().checkAnswer()?.answerState.userInput).toEqual(blank), {
        timeout: 5000,
      });
      expect(renderedHintBodies(container)).toHaveLength(1);
      setAnswerState({ userInput: solved });
      await waitFor(() => {
        expect(api().checkAnswer().answerState.userInput).toEqual(solved);
        expect(api().checkAnswer().correct).toBe(true);
      });
    },
    20000,
  );

  it('selects both correct dropdown values when mounted in solution mode', async () => {
    const fixture = sandboxFixtures.find(item => item.category === 'Dropdown');
    const item = JSON.parse(fixture.item);
    const dropdowns = Object.entries(item.question.widgets).filter(
      ([, widget]) => widget.type === 'dropdown',
    );
    item.question.content = dropdowns.map(([id]) => `[[☃ ${id}]]`).join('\n\n');
    item.hints = [];
    const { api } = await mountRenderer(
      { perseusItemString: JSON.stringify(item), packageFiles: {}, sourceId: fixture.id },
      { showCorrectAnswer: true },
    );
    const expected = Object.fromEntries(
      dropdowns.map(([id, widget]) => [
        id,
        { value: widget.options.choices.findIndex(choice => choice.correct) + 1 },
      ]),
    );
    await waitFor(
      () => {
        const result = api().checkAnswer();
        expect(result?.answerState.userInput).toEqual(expected);
        expect(result.correct).toBe(true);
      },
      { timeout: 5000 },
    );
  });

  it('selects every authored marker answer when showing the label-image solution', async () => {
    const fixture = sandboxFixtures.find(item => item.category === 'Label image');
    const [[id, widget]] = Object.entries(JSON.parse(fixture.item).question.widgets);
    const { api, setShowAnswer } = await mountRenderer({
      perseusItemString: fixture.item,
      packageFiles: fixture.files,
      sourceId: fixture.id,
    });
    await waitFor(() => expect(api().checkAnswer()?.correct).toBe(false), { timeout: 5000 });
    setShowAnswer(true);
    await waitFor(
      () => {
        const result = api().checkAnswer();
        expect(result.answerState.userInput[id].markers.map(marker => marker.selected)).toEqual(
          widget.options.markers.map(marker => marker.answers),
        );
        expect(result.correct).toBe(true);
      },
      { timeout: 5000 },
    );
  });

  describe('label-image marker names', () => {
    const fixture = sandboxFixtures.find(item => item.category === 'Label image');

    async function mountMarkers(editMarkers = () => {}) {
      const item = JSON.parse(fixture.item);
      const [widget] = Object.values(item.question.widgets);
      editMarkers(widget.options.markers);
      const rendered = await mountRenderer({
        perseusItemString: JSON.stringify(item),
        packageFiles: fixture.files,
        sourceId: fixture.id,
      });
      await waitFor(() => expect(rendered.api().checkAnswer()?.correct).toBe(false), {
        timeout: 5000,
      });
      return { markers: widget.options.markers, ...rendered };
    }

    function expectMarkerNames(expected) {
      const comboboxes = screen.getAllByRole('combobox');
      expect(comboboxes).toHaveLength(expected.length);
      comboboxes.forEach((combobox, index) =>
        expect(combobox).toHaveAccessibleName(expected[index]),
      );
    }

    it('names each blank marker by its position', async () => {
      const { markers } = await mountMarkers();

      expectMarkerNames(markers.map((marker, index) => String(index + 1)));
    });

    it('names a marker by its authored label, and blank ones by their position', async () => {
      const label = 'Bar A';
      await mountMarkers(markers => {
        markers[0].label = label;
        markers[1].label = ' ';
        delete markers[2].label;
        markers[3].label = '';
      });

      expectMarkerNames([label, '2', '3', '4']);
      expect(screen.getAllByLabelText(label)).toEqual([
        screen.getByRole('combobox', { name: label }),
      ]);
    });

    it('keeps marker names when showing the answer', async () => {
      const label = 'Bar A';
      const { api, setShowAnswer } = await mountMarkers(markers => {
        markers[0].label = label;
      });

      setShowAnswer(true);
      await waitFor(() => expect(api().checkAnswer()?.correct).toBe(true), { timeout: 5000 });

      expectMarkerNames([label, '2', '3', '4']);
      screen.getAllByRole('combobox').forEach(marker => {
        expect(within(marker).getByLabelText(perseusTranslator.correctExcited$())).toBeVisible();
      });
    });

    it.each(['2', 2])(
      'keeps blank marker names distinct from a numeric authored label %p',
      async label => {
        await mountMarkers(markers => {
          markers[0].label = label;
        });

        expectMarkerNames(['2', '6', '3', '4']);
      },
    );
  });

  it("does not render a saved attempt's hints in read-only mode", async () => {
    const fixture = sandboxFixtures.find(item => item.category === 'Dropdown');
    const totalHints = JSON.parse(fixture.item).hints.length;
    const { api, container, setAnswerState } = await mountRenderer(
      { perseusItemString: fixture.item, packageFiles: fixture.files, sourceId: fixture.id },
      { interactive: false, answerState: { hintsVisible: 1 } },
    );
    await waitFor(() => expect(api().checkAnswer()).not.toBeNull(), { timeout: 5000 });
    setAnswerState({ hintsVisible: 2 });
    await global.flushPromises();
    expect(api().availableHints.value).toBe(totalHints);
    expect(renderedHintBodies(container)).toHaveLength(0);
  });

  it('blocks physical keys in a read-only math field', async () => {
    const fixture = sandboxFixtures.find(item => item.category === 'Input number');
    const { api, container } = await mountRenderer(
      { perseusItemString: fixture.item, packageFiles: fixture.files, sourceId: fixture.id },
      { interactive: false },
    );
    await waitFor(() => expect(api().checkAnswer()).not.toBeNull(), { timeout: 5000 });
    const input = container.querySelector('.keypad-input');
    const before = api().checkAnswer().answerState;
    const onKeyUp = jest.fn();
    input.addEventListener('keyup', onKeyUp);
    await fireEvent.keyUp(input, { key: '8', code: 'Digit8', keyCode: 56, cancelable: true });
    expect(onKeyUp).not.toHaveBeenCalled();
    expect(api().checkAnswer().answerState).toEqual(before);
  });

  it('does not report programmatic changes as learner interaction by default', async () => {
    const itemData = embellishedItemData({ packageFiles: {}, sourceId: 'radio' });
    const rendered = await mountRenderer(itemData);
    const onInteraction = jest.fn();
    rendered.instance().$on('interaction', onInteraction);
    rendered.setShowAnswer(true);

    await waitFor(() => expect(rendered.api().checkAnswer()?.correct).toBe(true));
    expect(onInteraction).not.toHaveBeenCalled();
  });

  it('reports committed programmatic answers when opted in', async () => {
    const itemData = embellishedItemData({ packageFiles: {}, sourceId: 'radio' });
    const onInteraction = jest.fn();
    const rendered = await mountRenderer(
      { ...itemData, emitProgrammaticInteractions: true },
      { showCorrectAnswer: true, onInteraction },
    );
    await waitFor(() =>
      expect(onInteraction).toHaveBeenLastCalledWith(expect.objectContaining({ correct: true })),
    );
    onInteraction.mockClear();
    const userInput = { 'radio 1': { selectedChoiceIds: [] } };
    rendered.setAnswerState({ userInput });
    await waitFor(() =>
      expect(onInteraction).toHaveBeenLastCalledWith(
        expect.objectContaining({
          correct: false,
          answerState: expect.objectContaining({ userInput }),
        }),
      ),
    );
  });

  it.each([0, 1])('preserves external focus when restoring a hint from %i', async initialCount => {
    const fixture = sandboxFixtures.find(item => item.category === 'Input number');
    const rendered = await mountRenderer(
      { perseusItemString: fixture.item, packageFiles: fixture.files, sourceId: fixture.id },
      { answerState: { hintsVisible: initialCount } },
    );
    await waitFor(() =>
      expect(rendered.instance().itemRenderer.props.hintsVisible).toBe(initialCount),
    );
    if (initialCount === 0) rendered.setAnswerState({ hintsVisible: 1 });
    await waitFor(() => expect(renderedHintBodies(rendered.container)).toHaveLength(1));
    expect(screen.getByRole('button', { name: OUTSIDE_BUTTON })).toHaveFocus();
  });

  it('keeps a taken hint across solution toggles and attempt changes in read-only mode', async () => {
    const fixture = sandboxFixtures.find(item => item.category === 'Dropdown');
    const { api, instance, container, setShowAnswer, setAnswerState } = await mountRenderer(
      { perseusItemString: fixture.item, packageFiles: fixture.files, sourceId: fixture.id },
      { interactive: false, showCorrectAnswer: true, answerState: { hintsVisible: 0 } },
    );
    await waitFor(() => expect(api().checkAnswer()?.correct).toBe(true));
    api().takeHint();
    await waitFor(() => expect(renderedHintBodies(container)).toHaveLength(1));
    for (const showAnswer of [false, true, false]) {
      setShowAnswer(showAnswer);
      await waitFor(() => {
        expect(instance().itemRenderer.props.reviewMode).toBe(showAnswer);
        expect(api().checkAnswer()?.correct).toBe(showAnswer);
        expect(renderedHintBodies(container)).toHaveLength(1);
      });
    }
    setAnswerState({ hintsVisible: 0 });
    await global.flushPromises();
    expect(api().checkAnswer().answerState.hintsVisible).toBe(1);
    expect(renderedHintBodies(container)).toHaveLength(1);
  });

  it('restores the blank attempt when a saved answer is cleared', async () => {
    const fixture = sandboxFixtures.find(item => item.category === 'Dropdown');
    const [id] = Object.keys(JSON.parse(fixture.item).question.widgets);
    const { api, setAnswerState } = await mountRenderer({
      perseusItemString: fixture.item,
      packageFiles: {},
      sourceId: fixture.id,
    });
    await waitFor(() => expect(api().checkAnswer()?.answerState.hintsVisible).toBe(0));
    const blank = api().checkAnswer().answerState;
    for (const value of [1, 2]) {
      const attempt = { userInput: { [id]: { value } }, hintsVisible: value };
      setAnswerState(attempt);
      await waitFor(() => expect(api().checkAnswer().answerState).toMatchObject(attempt));
    }
    setAnswerState(null);
    await waitFor(() => expect(api().checkAnswer().answerState).toEqual(blank));
  });

  it('restores every saved dropdown when leaving solution mode', async () => {
    const fixture = sandboxFixtures.find(item => item.category === 'Dropdown');
    const item = JSON.parse(fixture.item);
    const ids = Object.keys(item.question.widgets);
    item.question.content = ids.map(id => `[[☃ ${id}]]`).join('\n\n');
    item.question.images = {};
    item.hints = [{ content: 'Hint', images: {}, widgets: {} }];
    const savedInput = Object.fromEntries(ids.map((id, index) => [id, { value: index + 1 }]));
    const rendered = await mountRenderer(
      { perseusItemString: JSON.stringify(item), packageFiles: {}, sourceId: fixture.id },
      { showCorrectAnswer: true, answerState: { userInput: savedInput } },
    );
    await waitFor(() => {
      expect(rendered.api().checkAnswer()?.answerState.userInput).toEqual(savedInput);
    });
    const seed = rendered.instance().itemRenderer.props.problemNum;
    rendered.setShowAnswer(false);
    await waitFor(() => {
      expect(rendered.instance().itemRenderer.props.showSolutions).toBe('none');
      expect(rendered.api().checkAnswer()?.answerState.userInput).toEqual(savedInput);
    });
    expect(rendered.instance().itemRenderer.props.problemNum).toBe(seed);
    rendered.setAnswerState({ userInput: savedInput, hintsVisible: 1 });
    await waitFor(() => expect(rendered.instance().itemRenderer.props.hintsVisible).toBe(1));
    rendered.setShowAnswer(true);
    await waitFor(() => expect(rendered.instance().itemRenderer.props.showSolutions).toBe('all'));
    rendered.setShowAnswer(false);
    await waitFor(() => expect(rendered.instance().itemRenderer.props.showSolutions).toBe('none'));
    rendered.setAnswerState({ userInput: savedInput, hintsVisible: 0 });
    await waitFor(() => expect(rendered.instance().itemRenderer.props.hintsVisible).toBe(0));
    expect(rendered.instance().itemRenderer.props.problemNum).toBe(seed);
    expect(rendered.api().checkAnswer().answerState.userInput).toEqual(savedInput);
  });

  it('clears a solution requested before the first React commit and releases the keypad', async () => {
    const fixture = sandboxFixtures.find(item => item.category === 'Input number');
    const rendered = await mountRenderer(
      { perseusItemString: fixture.item, packageFiles: {}, sourceId: fixture.id },
      { showAnswerOnStart: true },
    );
    await waitFor(() => expect(rendered.api().checkAnswer()?.correct).toBe(true));
    const { keypadAPI, keypadContextValue } = rendered.instance();
    const handler = jest.fn();
    keypadAPI.setKeyHandler(handler);
    keypadAPI.activate();
    rendered.setShowAnswer(false);
    await waitFor(() => expect(rendered.api().checkAnswer()?.correct).toBe(false));
    expect(keypadContextValue.keypadActive).toBe(false);
    const field = document.createElement('input');
    field.className = 'keypad-input';
    field.addEventListener('keyup', rendered.instance().handleMathFieldKey);
    await fireEvent.keyUp(field, { key: '7' });
    expect(handler).not.toHaveBeenCalled();
  });

  it('restores the initial graph when leaving a solution shown at mount', async () => {
    const fixture = sandboxFixtures.find(item => item.category === 'Grapher');
    const itemData = { perseusItemString: fixture.item, packageFiles: {}, sourceId: fixture.id };
    const [widgetId] = Object.keys(JSON.parse(fixture.item).question.widgets);
    const initialInput = { [widgetId]: { type: 'absolute_value', coords: null, asymptote: null } };

    const rendered = await mountRenderer(itemData, { showCorrectAnswer: true });
    await waitFor(() => expect(rendered.api().checkAnswer()?.correct).toBe(true), {
      timeout: 5000,
    });
    rendered.setShowAnswer(false);
    await rendered.instance().$nextTick();
    expect(rendered.instance().showCorrectAnswer).toBe(false);
    await waitFor(
      () => {
        expect(rendered.instance().itemRenderer.props.showSolutions).toBe('none');
        expect(rendered.api().checkAnswer()?.answerState.userInput).toEqual(initialInput);
        expect(rendered.api().checkAnswer().correct).toBe(false);
      },
      { timeout: 5000 },
    );
  }, 15000);
});
