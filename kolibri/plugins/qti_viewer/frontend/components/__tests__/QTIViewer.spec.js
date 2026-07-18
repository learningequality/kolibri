import { render, screen } from '@testing-library/vue';
import { nextTick } from 'vue';
// eslint-disable-next-line import-x/named
import useContentViewer, { useContentViewerMock } from 'kolibri/composables/useContentViewer';
import items from '../__fixtures__/items';
import QTIViewer from '../QTIViewer.vue';

jest.mock('kolibri/composables/useContentViewer');

// Drive the integration tests through the shipped sandbox fixtures, the same way
// the other QTI-focused integration tests do. `kolibri-hint-multi` carries three
// `ext:kolibri-hint` cards (its second body holds MathML); `kolibri-hint-image`
// carries one hint whose body contains an `<img>`.
const MULTI_HINT_XML = items['kolibri-hint-multi'].xml;
const IMAGE_HINT_XML = items['kolibri-hint-image'].xml;
const NO_HINT_XML = items['q2-choice-interaction-single-sv-1'].xml;

// Plain-text bodies of the multi-hint fixture's first and last cards, in document
// order, plus the image hint's alt text — the visible content each reveal surfaces.
const FIRST_HINT = 'Start by counting up from one.';
const LAST_HINT = 'The answer is two.';
const IMAGE_ALT = 'Never leave luggage unattended';

// Capture the API the viewer registers through useContentViewer. The register API
// is now the only surface for checkAnswer + hints — QTIViewer no longer exposes
// them on its own instance — so the integration test drives hints through it.
let registeredApi;

function mockViewer(xml) {
  registeredApi = null;
  useContentViewer.mockImplementation(() => ({
    ...useContentViewerMock({ itemData: xml }),
    registerAssessmentApi: api => {
      registeredApi = api;
    },
  }));
}

async function takeHint() {
  registeredApi.takeHint();
  await nextTick();
}

const Harness = {
  components: { QTIViewer },
  data: () => ({ hintEvents: [] }),
  methods: {
    onHint(payload) {
      this.hintEvents.push(payload);
    },
  },
  template: `<div>
    <span data-testid="emitCount">{{ hintEvents.length }}</span>
    <span data-testid="firstHasAnswerState">{{ hintEvents.length > 0 && 'answerState' in hintEvents[0] }}</span>
    <QTIViewer @hintTaken="onHint" />
  </div>`,
};

describe('QTIViewer hints', () => {
  it('registers hint totals and reveals hints in document order', async () => {
    mockViewer(MULTI_HINT_XML);
    render(Harness);
    await nextTick();

    expect(registeredApi.totalHints.value).toBe(3);
    expect(registeredApi.availableHints.value).toBe(3);
    expect(screen.queryByText(FIRST_HINT)).not.toBeInTheDocument();

    await takeHint();
    expect(registeredApi.availableHints.value).toBe(2);
    expect(screen.getByText(FIRST_HINT)).toBeInTheDocument();
    expect(screen.queryByText(LAST_HINT)).not.toBeInTheDocument();

    await takeHint();
    await takeHint();
    expect(registeredApi.availableHints.value).toBe(0);
    // The first-revealed card still precedes the last-revealed one in the DOM.
    const first = screen.getByText(FIRST_HINT);
    const last = screen.getByText(LAST_HINT);
    expect(first.compareDocumentPosition(last) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('emits hintTaken with an answerState only while hints remain', async () => {
    mockViewer(MULTI_HINT_XML);
    const { getByTestId } = render(Harness);
    await nextTick();

    // Reveal all three hints, then attempt a fourth reveal past exhaustion.
    await takeHint();
    await takeHint();
    await takeHint();
    await takeHint();

    expect(getByTestId('emitCount')).toHaveTextContent('3');
    expect(getByTestId('firstHasAnswerState')).toHaveTextContent('true');
  });

  it('renders an image contained in a revealed hint', async () => {
    mockViewer(IMAGE_HINT_XML);
    render(Harness);
    await nextTick();

    await takeHint();
    expect(screen.getByAltText(IMAGE_ALT)).toBeInTheDocument();
  });

  it('reports no hints when the item has no ext:kolibri-hint cards', async () => {
    mockViewer(NO_HINT_XML);
    render(Harness);
    await nextTick();

    expect(registeredApi.totalHints.value).toBe(0);
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('reports no hints for real catalog content with only glossary cards', async () => {
    mockViewer(items['a13-a15-captions-glossary'].xml);
    render(Harness);
    await nextTick();

    expect(registeredApi.totalHints.value).toBe(0);
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });
});
