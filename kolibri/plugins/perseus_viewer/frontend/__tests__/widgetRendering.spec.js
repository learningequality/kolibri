import { screen } from '@testing-library/vue';
import { init } from '@khanacademy/perseus';
import { rawItem } from '../testUtils/makeItem';
import mountRenderer from '../testUtils/mountRenderer';

jest.mock('kolibri/composables/useContentViewer');

jest.mock('kolibri/urls');

init();

function itemData(widgetType, options) {
  return itemDataWithWidgets({ [`${widgetType} 1`]: { type: widgetType, options } });
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
