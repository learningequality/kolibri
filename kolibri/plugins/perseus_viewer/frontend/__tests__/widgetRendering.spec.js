import { screen } from '@testing-library/vue';
import { ref } from 'vue';
import { init } from '@khanacademy/perseus';
import {
  generateExpressionWidget,
  generateFreeResponseWidget,
  generateGradedGroupSetWidget,
  generateGradedGroupWidget,
  generateGroupWidget,
  generateInputNumberWidget,
  generateInteractiveGraphWidget,
  generateLabelImageOptions,
  generateLabelImageWidget,
  generateMatcherWidget,
  generateMatrixWidget,
  generateMeasurerWidget,
  generateNumberLineOptions,
  generateNumericInputWidget,
  generatePhetSimulationWidget,
  generateSorterWidget,
  generateVideoWidget,
} from '@khanacademy/perseus-core';
import { rawItem } from '../testUtils/makeItem';
import mountRenderer from '../testUtils/mountRenderer';
import perseusTranslator from '../translator';

jest.mock('kolibri/composables/useContentViewer');

jest.mock('kolibri/urls');

init();

function itemData(widgetType, options) {
  return itemDataWithWidgets({ [`${widgetType} 1`]: { type: widgetType, options } });
}

function itemDataWithGeneratedWidget(widget) {
  return { perseusItemString: JSON.stringify(rawItem({ [`${widget.type} 1`]: widget })) };
}

function itemDataWithWidgets(widgets) {
  const item = rawItem(
    Object.fromEntries(
      Object.entries(widgets).map(([id, { type, options }]) => [
        id,
        { type, graded: true, options, version: { major: 0, minor: 0 } },
      ]),
    ),
  );
  return { perseusItemString: JSON.stringify(item) };
}

function grapherOptions(correct) {
  return {
    availableTypes: [correct.type],
    correct,
    graph: {
      backgroundImage: { url: null },
      labels: ['x', 'y'],
      markings: 'graph',
      range: [
        [-10, 10],
        [-10, 10],
      ],
      rulerLabel: '',
      rulerTicks: 10,
      showProtractor: false,
      showRuler: false,
      snapStep: [0.5, 0.5],
      step: [1, 1],
      valid: true,
    },
  };
}

const GRAPHER_ANSWERS = [
  {
    type: 'logarithm',
    coords: [
      [-3, -2],
      [-2, 2],
    ],
    asymptote: [
      [-4, 0],
      [-4, 1],
    ],
  },
  {
    type: 'absolute_value',
    coords: [
      [0, 0],
      [2, 2],
    ],
  },
  {
    type: 'exponential',
    coords: [
      [0, 2],
      [1, 3],
    ],
    asymptote: [
      [0, 1],
      [1, 1],
    ],
  },
  {
    type: 'tangent',
    coords: [
      [0, 0],
      [1, 1],
    ],
  },
  {
    type: 'sinusoid',
    coords: [
      [0, 0],
      [1, 1],
    ],
  },
];

describe('grapher items rendered as interactive graphs', () => {
  async function settle() {
    for (let i = 0; i < 3; i++) {
      await global.flushPromises();
      await new Promise(resolve => requestAnimationFrame(resolve));
    }
  }

  it.each(GRAPHER_ANSWERS)('describes a $type graph to screen readers', async correct => {
    await mountRenderer(itemData('grapher', grapherOptions(correct)));

    // Role queries without `hidden` call jsdom's getComputedStyle, which throws on a
    // stylesheet Perseus's interactive graph injects.
    const graph = screen.getByRole('figure', { hidden: true });
    expect(graph).toHaveAccessibleDescription(
      /Interactive elements: \w.* graph with .*\d comma \d/,
    );
    expect(graph).not.toHaveAccessibleDescription(/undefined/);
  });

  it('draws the correct answer when showing it', async () => {
    const correct = {
      type: 'absolute_value',
      coords: [
        [-3, 2],
        [-2, 4],
      ],
    };
    await mountRenderer(itemData('grapher', grapherOptions(correct)), { showCorrectAnswer: true });

    expect(screen.getByRole('figure', { hidden: true })).toHaveAccessibleDescription(
      /vertex point at -3 comma 2, arm point at -2 comma 4/,
    );
  });

  it('draws a restored answer', async () => {
    const correct = GRAPHER_ANSWERS.find(answer => answer.type === 'absolute_value');
    const saved = {
      type: 'absolute_value',
      coords: [
        [1, 1],
        [2, 3],
      ],
    };
    const { instance } = await mountRenderer(itemData('grapher', grapherOptions(correct)), {
      answerState: { userInput: { 'grapher 1': saved }, hintsVisible: 0 },
    });
    await settle();

    expect(screen.getByRole('figure', { hidden: true })).toHaveAccessibleDescription(
      /vertex point at 1 comma 1, arm point at 2 comma 3/,
    );
    expect(
      screen.getByRole('button', {
        name: perseusTranslator.srAbsoluteValueVertexPoint$({ x: 1, y: 1 }),
        hidden: true,
      }),
    ).toHaveAttribute('aria-disabled', 'false');
    expect(instance().getAnswerState().userInput['grapher 1'].coords).toEqual(saved.coords);
  });

  it.each([
    [
      'graded-group',
      widgets => ({ title: 'Part 1', content: '[[☃ grapher 1]]', images: {}, widgets }),
    ],
    [
      'graded-group-set',
      widgets => ({
        gradedGroups: [{ title: 'Part 1', content: '[[☃ grapher 1]]', images: {}, widgets }],
      }),
    ],
  ])('draws a restored answer of a grapher inside a %s', async (type, groupOptions) => {
    const correct = GRAPHER_ANSWERS.find(answer => answer.type === 'absolute_value');
    const saved = {
      type: 'absolute_value',
      coords: [
        [1, 1],
        [2, 3],
      ],
    };
    const groupId = `${type} 1`;
    await mountRenderer(
      itemData(
        type,
        groupOptions({
          'grapher 1': { type: 'grapher', graded: true, options: grapherOptions(correct) },
        }),
      ),
      { answerState: { userInput: { [groupId]: { 'grapher 1': saved } }, hintsVisible: 0 } },
    );
    await settle();

    expect(screen.getByRole('figure', { hidden: true })).toHaveAccessibleDescription(
      /vertex point at 1 comma 1, arm point at 2 comma 3/,
    );
  });

  describe('when the correct answer is hidden again', () => {
    const correct = {
      type: 'absolute_value',
      coords: [
        [-3, 2],
        [-2, 4],
      ],
    };
    const DEFAULT_DESCRIPTION = /vertex point at 0 comma 0, arm point at 5 comma 5/;

    it('clears the drawn answer when there is no saved answer', async () => {
      const showCorrectAnswer = ref(false);
      const { instance } = await mountRenderer(itemData('grapher', grapherOptions(correct)), {
        showCorrectAnswer,
      });
      showCorrectAnswer.value = true;
      await settle();
      showCorrectAnswer.value = false;
      await settle();

      expect(screen.getByRole('figure', { hidden: true })).toHaveAccessibleDescription(
        DEFAULT_DESCRIPTION,
      );
      expect(instance().checkAnswer().correct).toBe(false);
    });

    it("draws the learner's answer when a report swaps it back in", async () => {
      const saved = {
        type: 'absolute_value',
        coords: [
          [1, 1],
          [2, 3],
        ],
      };
      const learnerAnswer = { userInput: { 'grapher 1': saved }, hintsVisible: 0 };
      const showCorrectAnswer = ref(false);
      const answerState = ref(learnerAnswer);
      const { instance } = await mountRenderer(itemData('grapher', grapherOptions(correct)), {
        interactive: false,
        showCorrectAnswer,
        answerState,
      });
      answerState.value = null;
      showCorrectAnswer.value = true;
      await settle();
      answerState.value = learnerAnswer;
      showCorrectAnswer.value = false;
      await settle();

      expect(screen.getByRole('figure', { hidden: true })).toHaveAccessibleDescription(
        /vertex point at 1 comma 1, arm point at 2 comma 3/,
      );
      expect(instance().getAnswerState().userInput['grapher 1'].coords).toEqual(saved.coords);
    });

    it('clears the drawn answer when a report moves from two answers to a non-answer', async () => {
      const graphAnswer = coords => ({
        userInput: { 'grapher 1': { type: 'absolute_value', coords } },
        hintsVisible: 0,
      });
      const answerState = ref(
        graphAnswer([
          [1, 1],
          [2, 3],
        ]),
      );
      await mountRenderer(itemData('grapher', grapherOptions(correct)), {
        interactive: false,
        answerState,
      });
      await settle();
      answerState.value = graphAnswer([
        [4, 4],
        [5, 6],
      ]);
      await settle();
      answerState.value = null;
      await settle();

      expect(screen.getByRole('figure', { hidden: true })).toHaveAccessibleDescription(
        DEFAULT_DESCRIPTION,
      );
    });

    it('clears the drawn answer in a report with no saved answer', async () => {
      const showCorrectAnswer = ref(false);
      await mountRenderer(itemData('grapher', grapherOptions(correct)), {
        interactive: false,
        showCorrectAnswer,
        answerState: null,
      });
      showCorrectAnswer.value = true;
      await settle();
      showCorrectAnswer.value = false;
      await settle();

      expect(screen.getByRole('figure', { hidden: true })).toHaveAccessibleDescription(
        DEFAULT_DESCRIPTION,
      );
    });
  });

  it('draws the correct answer of a grapher inside a group', async () => {
    const correct = {
      type: 'absolute_value',
      coords: [
        [-3, 2],
        [-2, 4],
      ],
    };
    const answerUnavailable = jest.fn();
    const { instance } = await mountRenderer(
      itemData('group', {
        content: '[[☃ grapher 1]] [[☃ dropdown 1]]',
        images: {},
        widgets: {
          'grapher 1': { type: 'grapher', graded: true, options: grapherOptions(correct) },
          'dropdown 1': {
            type: 'dropdown',
            graded: true,
            options: dropdownOptions(['Apple', 'Banana'], 'Banana'),
          },
        },
      }),
      { showCorrectAnswer: true },
      { answerUnavailable },
    );

    expect(answerUnavailable).not.toHaveBeenCalled();
    expect(screen.getByRole('figure', { hidden: true })).toHaveAccessibleDescription(
      /vertex point at -3 comma 2, arm point at -2 comma 4/,
    );
    expect(screen.getByRole('combobox')).toHaveTextContent('Banana');
    expect(instance().checkAnswer().correct).toBe(true);
  });
});

function dropdownOptions(choices, correct) {
  return {
    placeholder: 'Pick one',
    static: false,
    choices: choices.map(content => ({ content, correct: content === correct })),
  };
}

const TWO_DROPDOWNS = itemDataWithWidgets({
  'dropdown 1': { type: 'dropdown', options: dropdownOptions(['Apple', 'Banana'], 'Banana') },
  'dropdown 2': { type: 'dropdown', options: dropdownOptions(['Carrot', 'Leek'], 'Carrot') },
});

describe('restored answers', () => {
  it('selects the saved choice in every dropdown', async () => {
    await mountRenderer(TWO_DROPDOWNS, {
      answerState: {
        userInput: { 'dropdown 1': { value: 1 }, 'dropdown 2': { value: 2 } },
        hintsVisible: 0,
      },
    });

    const [first, second] = screen.getAllByRole('combobox');
    expect(first).toHaveTextContent('Apple');
    expect(second).toHaveTextContent('Leek');
  });

  it('keeps the answer when a hint is taken', async () => {
    const hint = { content: 'Think about fruit', images: {}, widgets: {} };
    const { api, instance } = await mountRenderer(
      {
        perseusItemString: JSON.stringify(
          rawItem(
            {
              'dropdown 1': {
                type: 'dropdown',
                graded: true,
                options: dropdownOptions(['Apple', 'Banana'], 'Banana'),
              },
            },
            [hint],
          ),
        ),
      },
      { answerState: { userInput: { 'dropdown 1': { value: 2 } }, hintsVisible: 0 } },
    );

    api().takeHint();
    await new Promise(resolve => requestAnimationFrame(resolve));

    expect(instance().getAnswerState().userInput['dropdown 1']).toEqual({ value: 2 });
    expect(screen.getByRole('combobox')).toHaveTextContent('Banana');
  });

  it('clears the answer when a report moves from two answers to a non-answer', async () => {
    const answerState = ref({ userInput: { 'dropdown 1': { value: 1 } }, hintsVisible: 0 });
    const { instance } = await mountRenderer(
      itemData('dropdown', dropdownOptions(['Apple', 'Banana'], 'Banana')),
      { interactive: false, answerState },
    );
    answerState.value = { userInput: { 'dropdown 1': { value: 2 } }, hintsVisible: 0 };
    await global.flushPromises();
    answerState.value = null;
    await global.flushPromises();

    expect(screen.getByRole('combobox')).toHaveTextContent('Pick one');
    expect(instance().getAnswerState().userInput['dropdown 1']).toEqual({ value: 0 });
  });
});

// Graphie draws each plotter bar as a closed path of four line segments.
function barHeights(container) {
  return [...container.querySelectorAll('path')]
    .map(path => path.getAttribute('d').match(/L/g)?.length === 4 && path.getAttribute('d'))
    .filter(Boolean)
    .map(d => {
      const ys = d.match(/[\d.]+,([\d.]+)/g).map(point => Number(point.split(',')[1]));
      return Math.max(...ys) - Math.min(...ys);
    });
}

describe('show correct answer', () => {
  it('selects the correct choice in every dropdown', async () => {
    await mountRenderer(TWO_DROPDOWNS, { showCorrectAnswer: true });

    const [first, second] = screen.getAllByRole('combobox');
    expect(first).toHaveTextContent('Banana');
    expect(second).toHaveTextContent('Carrot');
  });

  it('shows the correct answer alongside a widget that is not scored', async () => {
    const answerUnavailable = jest.fn();
    await mountRenderer(
      itemDataWithWidgets({
        'dropdown 1': { type: 'dropdown', options: dropdownOptions(['Apple', 'Banana'], 'Banana') },
        'definition 1': {
          type: 'definition',
          options: { togglePrompt: 'ethanol', definition: 'An alcohol' },
        },
      }),
      { showCorrectAnswer: true },
      { answerUnavailable },
    );

    expect(answerUnavailable).not.toHaveBeenCalled();
    expect(screen.getByRole('combobox')).toHaveTextContent('Banana');
  });

  it('reports that the answer is unavailable when a widget has no solver', async () => {
    const answerUnavailable = jest.fn();
    await mountRenderer(
      itemDataWithWidgets({
        'dropdown 1': { type: 'dropdown', options: dropdownOptions(['Apple', 'Banana'], 'Banana') },
        'free-response 1': generateFreeResponseWidget(),
      }),
      { showCorrectAnswer: true },
      { answerUnavailable },
    );

    expect(answerUnavailable).toHaveBeenCalledTimes(1);
  });

  const DROPDOWN_CONTENT = {
    content: '[[☃ dropdown 1]]',
    images: {},
    widgets: {
      'dropdown 1': {
        type: 'dropdown',
        graded: true,
        options: dropdownOptions(['Apple', 'Banana'], 'Banana'),
      },
    },
  };

  it.each([
    ['graded-group', { ...DROPDOWN_CONTENT, title: 'Part 1' }],
    ['graded-group-set', { gradedGroups: [{ ...DROPDOWN_CONTENT, title: 'Part 1' }] }],
  ])('reports that the answer is unavailable for a %s', async (type, options) => {
    const answerUnavailable = jest.fn();
    await mountRenderer(
      itemData(type, options),
      { showCorrectAnswer: true },
      { answerUnavailable },
    );

    expect(answerUnavailable).toHaveBeenCalledTimes(1);
  });

  it('selects the correct choice of a dropdown inside a group', async () => {
    const answerUnavailable = jest.fn();
    const { instance } = await mountRenderer(
      itemData('group', {
        ...DROPDOWN_CONTENT,
        content: `${DROPDOWN_CONTENT.content} [[☃ image 1]]`,
        widgets: {
          ...DROPDOWN_CONTENT.widgets,
          'image 1': { type: 'image', options: LEGACY_ITEMS.image },
        },
      }),
      { showCorrectAnswer: true },
      { answerUnavailable },
    );

    expect(answerUnavailable).not.toHaveBeenCalled();
    expect(screen.getByRole('combobox')).toHaveTextContent('Banana');
    expect(instance().checkAnswer().correct).toBe(true);
  });

  it('shows the answer of a group with a widget its content does not place', async () => {
    const answerUnavailable = jest.fn();
    await mountRenderer(
      itemData('group', {
        ...DROPDOWN_CONTENT,
        widgets: {
          ...DROPDOWN_CONTENT.widgets,
          'numeric-input 1': generateNumericInputWidget(),
        },
      }),
      { showCorrectAnswer: true },
      { answerUnavailable },
    );

    expect(answerUnavailable).not.toHaveBeenCalled();
    expect(screen.getByRole('combobox')).toHaveTextContent('Banana');
  });

  it('draws the correct bars when the answer is shown on a mounted plotter', async () => {
    const showCorrectAnswer = ref(false);
    const { container } = await mountRenderer(
      itemData('plotter', { ...LEGACY_ITEMS.plotter, correct: [3, 7] }),
      { showCorrectAnswer },
    );

    showCorrectAnswer.value = true;
    await global.flushPromises();

    const [first, second] = barHeights(container);
    expect(second / first).toBeCloseTo(7 / 3);
  });

  it('writes a decimal answer with the content language decimal separator', async () => {
    await mountRenderer(
      itemData('input-number', {
        value: 0.4,
        answerType: 'decimal',
        simplify: 'required',
        size: 'normal',
      }),
      { showCorrectAnswer: true, lang: { id: 'fr-fr' } },
    );

    expect(screen.getByRole('textbox', { hidden: true })).toHaveTextContent('0,4');
  });

  it('fills a table without reporting the answer as unavailable', async () => {
    const answerUnavailable = jest.fn();
    const { instance } = await mountRenderer(
      itemData('table', {
        headers: ['a'],
        rows: 2,
        columns: 1,
        answers: [['1'], ['2']],
      }),
      { showCorrectAnswer: true },
      { answerUnavailable },
    );

    expect(answerUnavailable).not.toHaveBeenCalled();
    expect(instance().checkAnswer().correct).toBe(true);
  });

  it('answers a legacy input-number in an item with a widget that fails to parse', async () => {
    const answerUnavailable = jest.fn();
    const { instance } = await mountRenderer(
      itemDataWithWidgets({
        'input-number 1': {
          type: 'input-number',
          options: { value: 0.5, simplify: 'required', size: 'normal', answerType: 'number' },
        },
        'measurer 1': generateMeasurerWidget(),
      }),
      { showCorrectAnswer: true },
      { answerUnavailable },
    );

    expect(answerUnavailable).not.toHaveBeenCalled();
    expect(screen.getByRole('textbox', { hidden: true })).toHaveTextContent('1/2');
    expect(instance().checkAnswer().correct).toBe(true);
  });

  it.each([
    ['no size', { value: 5, simplify: 'required', answerType: 'number' }],
    ['a boolean simplify', { value: 5, simplify: true, size: 'normal', answerType: 'number' }],
    ['no simplify', { value: 5, size: 'normal', answerType: 'number' }],
    ['an unknown answerType', { value: 5, simplify: 'required', size: 'normal', answerType: 'x' }],
    ['a string inexact', { value: 5, simplify: 'required', size: 'normal', inexact: 'false' }],
    ['a numeric rightAlign', { value: 5, simplify: 'required', size: 'normal', rightAlign: 0 }],
    [
      'null optional fields',
      {
        value: 5,
        simplify: 'required',
        size: 'normal',
        answerType: null,
        maxError: null,
        inexact: null,
        rightAlign: null,
      },
    ],
  ])('answers a legacy input-number with %s', async (_, options) => {
    const answerUnavailable = jest.fn();
    const { instance } = await mountRenderer(
      itemData('input-number', options),
      { showCorrectAnswer: true },
      { answerUnavailable },
    );

    expect(answerUnavailable).not.toHaveBeenCalled();
    expect(screen.getByRole('textbox', { hidden: true })).toHaveTextContent('5');
    expect(instance().checkAnswer().correct).toBe(true);
  });

  const LEGACY_INPUT_NUMBER = {
    type: 'input-number',
    graded: true,
    version: { major: 0, minor: 0 },
    options: { value: 0.5, simplify: 'required', size: 'normal', answerType: 'number' },
  };

  it.each([
    ['a null graded', { graded: null }],
    ['a null alignment', { alignment: null }],
    ['a null static', { static: null }],
    ['a version with no minor', { version: { major: 0 } }],
    ['a boolean maxError', { options: { ...LEGACY_INPUT_NUMBER.options, maxError: true } }],
  ])('answers a legacy input-number with %s', async (_, fields) => {
    const answerUnavailable = jest.fn();
    const { instance } = await mountRenderer(
      itemDataWithGeneratedWidget({ ...LEGACY_INPUT_NUMBER, ...fields }),
      { showCorrectAnswer: true },
      { answerUnavailable },
    );

    expect(answerUnavailable).not.toHaveBeenCalled();
    expect(screen.getByRole('textbox', { hidden: true })).toHaveTextContent('1/2');
    expect(instance().checkAnswer().correct).toBe(true);
  });

  it('accepts a restored answer to a legacy input-number with no size', async () => {
    const { instance } = await mountRenderer(
      itemData('input-number', { value: 5, simplify: 'required', answerType: 'number' }),
      {
        answerState: { userInput: { 'input-number 1': { currentValue: '5' } }, hintsVisible: 0 },
      },
    );

    expect(instance().checkAnswer().correct).toBe(true);
  });

  it.each([
    ['no simplify', {}],
    ['a boolean simplify', { simplify: true }],
  ])('rejects an unsimplified answer to a legacy input-number with %s', async (_, option) => {
    const { instance } = await mountRenderer(
      itemData('input-number', { value: 0.5, size: 'normal', answerType: 'number', ...option }),
      {
        answerState: { userInput: { 'input-number 1': { currentValue: '2/4' } }, hintsVisible: 0 },
      },
    );

    expect(instance().checkAnswer().correct).toBe(false);
  });
});

const RADIO_OPTIONS = {
  choices: [
    { content: 'Ethanol', correct: true },
    { content: 'Methanol', correct: false },
  ],
};

const MOLECULE_OPTIONS = { smiles: 'CCO', rotationAngle: 0 };

const DEPRECATED_STANDIN = perseusTranslator.deprecatedStandin$();

const DECIMAL_TICKS_NUMBER_LINE = generateNumberLineOptions({
  range: [0, 1],
  numDivisions: 5,
  tickStep: null,
  labelStyle: 'decimal ticks',
  labelTicks: false,
  correctX: 0.4,
});

const LEGACY_ITEMS = {
  radio: RADIO_OPTIONS,
  image: {
    backgroundImage: { url: 'https://example.com/a.png', width: 10, height: 10 },
    alt: 'A picture',
    labels: [],
    range: [
      [0, 10],
      [0, 10],
    ],
    box: [10, 10],
  },
  plotter: {
    type: 'bar',
    labels: ['x', 'y'],
    categories: ['A', 'B'],
    scaleY: 1,
    maxY: 10,
    snapsPerLine: 1,
    correct: [1, 2],
    starting: [0, 0],
    plotDimensions: [380, 300],
    labelInterval: 1,
  },
  orderer: {
    options: [{ content: 'One' }, { content: 'Two' }],
    correctOptions: [{ content: 'One' }, { content: 'Two' }],
    otherOptions: [],
    height: 'normal',
    layout: 'horizontal',
  },
  dropdown: dropdownOptions(['Apple', 'Banana'], 'Banana'),
  categorizer: {
    items: ['Cat', 'Oak'],
    categories: ['Animal', 'Plant'],
    values: [0, 1],
    randomizeItems: false,
  },
  definition: { togglePrompt: 'ethanol', definition: 'An alcohol' },
  explanation: { showPrompt: 'Explain', hidePrompt: 'Hide', explanation: 'Because', widgets: {} },
  iframe: {
    url: 'https://example.com',
    settings: [],
    width: '400',
    height: '400',
    allowFullScreen: false,
  },
  interaction: {
    graph: {
      editableSettings: [],
      box: [400, 400],
      labels: ['x', 'y'],
      range: [
        [-10, 10],
        [-10, 10],
      ],
      tickStep: [1, 1],
      gridStep: [1, 1],
      markings: 'graph',
    },
    elements: [],
  },
};

const GENERATED_WIDGETS = [
  generateMatcherWidget(),
  generateMatrixWidget(),
  generateSorterWidget(),
  generateMeasurerWidget(),
  generateGroupWidget(),
  generateGradedGroupWidget(),
  generateGradedGroupSetWidget(),
  generateFreeResponseWidget(),
  generateInteractiveGraphWidget(),
  generateLabelImageWidget(),
  generatePhetSimulationWidget(),
  generateVideoWidget(),
  generateInputNumberWidget(),
  generateNumericInputWidget(),
  generateExpressionWidget(),
];

const RENDERING_ERROR = 'Rendering Error!';

const WIDGET_CONTAINER = '.perseus-widget-container';

describe('legacy widget items', () => {
  beforeAll(() => {
    window.matchMedia = () => ({
      matches: false,
      addListener() {},
      removeListener() {},
      addEventListener() {},
      removeEventListener() {},
    });
  });

  afterAll(() => {
    delete window.matchMedia;
  });

  it.each(Object.entries(LEGACY_ITEMS))('renders a %s widget', async (type, options) => {
    const { container } = await mountRenderer(itemData(type, options));

    expect(container.querySelector(WIDGET_CONTAINER)).not.toBeEmptyDOMElement();
    expect(screen.queryByText(DEPRECATED_STANDIN)).not.toBeInTheDocument();
    expect(
      screen.queryByRole('img', { name: RENDERING_ERROR, hidden: true }),
    ).not.toBeInTheDocument();
  });

  it.each(GENERATED_WIDGETS.map(widget => [widget.type, widget]))(
    'renders a %s widget',
    async (type, widget) => {
      const { container } = await mountRenderer(itemDataWithGeneratedWidget(widget));

      expect(container.querySelector(WIDGET_CONTAINER)).not.toBeEmptyDOMElement();
      expect(screen.queryByText(DEPRECATED_STANDIN)).not.toBeInTheDocument();
      expect(
        screen.queryByRole('img', { name: RENDERING_ERROR, hidden: true }),
      ).not.toBeInTheDocument();
    },
  );

  it('labels every tick of a "decimal ticks" number line', async () => {
    await mountRenderer(itemData('number-line', DECIMAL_TICKS_NUMBER_LINE));

    const labels = screen.queryAllByRole('math', { hidden: true }).map(math => math.textContent);
    expect(labels).toEqual(expect.arrayContaining(['0', '0.2', '0.4', '0.6', '0.8', '1']));
  });

  it.each([
    ['transformer', {}],
    [
      'cs-program',
      { programID: '123', settings: [], showEditor: false, showButtons: false, height: 400 },
    ],
    ['python-program', { programID: '123', height: 400 }],
    ['video', { location: 'some-video-slug' }],
    ['iframe', { ...LEGACY_ITEMS.iframe, url: '123' }],
  ])('marks a %s widget as no longer available', async (type, options) => {
    const { container } = await mountRenderer(itemData(type, options));

    expect(screen.queryByText(DEPRECATED_STANDIN)).toBeInTheDocument();
    expect(container.querySelector('iframe')).toBeNull();
  });

  it('selects the correct choices for every label-image marker', async () => {
    const answerUnavailable = jest.fn();
    const { instance } = await mountRenderer(
      itemDataWithGeneratedWidget(
        generateLabelImageWidget({
          options: generateLabelImageOptions({
            choices: ['Nucleus', 'Membrane'],
            imageUrl: 'https://example.com/cell.png',
            imageWidth: 100,
            imageHeight: 100,
            markers: [
              { answers: ['Nucleus'], label: 'Centre', x: 50, y: 50 },
              { answers: ['Membrane'], label: 'Edge', x: 90, y: 90 },
            ],
          }),
        }),
      ),
      { showCorrectAnswer: true },
      { answerUnavailable },
    );

    expect(answerUnavailable).not.toHaveBeenCalled();
    expect(instance().checkAnswer().correct).toBe(true);
  });

  it.each([
    ['molecule-renderer', MOLECULE_OPTIONS],
    ['transformer', {}],
  ])('shows the correct choice of a dropdown next to a %s widget', async (type, options) => {
    await mountRenderer(
      itemDataWithWidgets({
        [`${type} 1`]: { type, options },
        'dropdown 1': {
          type: 'dropdown',
          options: dropdownOptions(['Methanol', 'Ethanol'], 'Ethanol'),
        },
      }),
      { showCorrectAnswer: true },
    );

    expect(screen.getByRole('combobox')).toHaveTextContent('Ethanol');
  });
});
