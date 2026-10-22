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
});
