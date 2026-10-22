import { screen } from '@testing-library/vue';
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
});

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
  'python-program': { programID: '123', height: 400 },
  'cs-program': {
    programID: '123',
    settings: [],
    showEditor: false,
    showButtons: false,
    height: 400,
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
    jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      clearRect: () => {},
      fillText: () => {},
      restore: () => {},
      save: () => {},
      stroke: () => {},
      translate: () => {},
    });
    global.Path2D = class Path2D {
      moveTo() {}
      lineTo() {}
    };
    window.matchMedia = () => ({
      matches: false,
      addListener() {},
      removeListener() {},
      addEventListener() {},
      removeEventListener() {},
    });
  });

  afterAll(() => {
    HTMLCanvasElement.prototype.getContext.mockRestore();
    delete global.Path2D;
    delete window.matchMedia;
  });

  it('draws a molecule described by its SMILES notation', async () => {
    await mountRenderer(itemData('molecule-renderer', MOLECULE_OPTIONS));

    expect(
      screen.getByRole('img', {
        name: perseusTranslator.molecularDrawing$({ content: MOLECULE_OPTIONS.smiles }),
      }),
    ).toBeInTheDocument();
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

  it('marks a transformer widget as no longer available', async () => {
    await mountRenderer(itemData('transformer', {}));

    expect(screen.queryByText(DEPRECATED_STANDIN)).toBeInTheDocument();
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

  it('shows the correct choice of a dropdown next to a molecule', async () => {
    await mountRenderer(
      itemDataWithWidgets({
        'molecule-renderer 1': { type: 'molecule-renderer', options: MOLECULE_OPTIONS },
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
