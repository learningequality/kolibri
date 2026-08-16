import { render, screen, within } from '@testing-library/vue';
// eslint-disable-next-line import-x/named
import useContentViewer, { useContentViewerMock } from 'kolibri/composables/useContentViewer';
import { init } from '@khanacademy/perseus';
import perseusFixtures from '../../../qti_viewer/frontend/components/__fixtures__/perseus';
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

async function mountRenderer(itemData) {
  let instance = null;
  let registeredApi = null;
  useContentViewer.mockImplementation(() => ({
    ...useContentViewerMock({ itemData, interactive: true }),
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
    template: `<PerseusRendererIndex ref="renderer" />`,
  };
  const utils = render(Harness);
  await global.flushPromises();
  await global.flushPromises();
  return { instance: () => instance, api: () => registeredApi, ...utils };
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
});

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

describe('PerseusRendererIndex with real QA-channel items', () => {
  // Perseus's graphie loader fetches each image's `-data.json` label file, which
  // jsdom cannot; its `parseDataFromJSONP` accepts an unwrapped JSON body.
  let originalFetch;
  beforeEach(() => {
    originalFetch = global.fetch;
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        text: () => Promise.resolve('{"range":[[0,10],[0,10]],"labels":[]}'),
      }),
    );
  });
  afterEach(() => {
    global.fetch = originalFetch;
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
});
