import { render, screen, waitFor } from '@testing-library/vue';
import { createTranslator } from 'kolibri/utils/i18n';
// eslint-disable-next-line import-x/named
import useContentViewer, { useContentViewerMock } from 'kolibri/composables/useContentViewer';
import SafeHtml5RendererIndex from '../SafeHtml5RendererIndex.vue';

const { articleContent$ } = createTranslator(
  SafeHtml5RendererIndex.name,
  SafeHtml5RendererIndex.$trs,
);

let mockEmitFromSafeHTML;

jest.mock('kolibri', () => ({
  canHandleElement: jest.fn(() => false),
}));

jest.mock('kolibri/composables/useContentViewer');

// Mock SafeHTML to render html content and provide controllable event emission
// for testing how the parent aggregates progress from embedded viewers.
jest.mock('kolibri-common/components/SafeHTML', () => ({
  createSafeHTML: () => ({
    name: 'SafeHTML',
    props: { html: String },
    created() {
      mockEmitFromSafeHTML = (event, ...args) => this.$emit(event, ...args);
    },
    render(h) {
      return h('div', { domProps: { innerHTML: this.html || '' } });
    },
  }),
}));

jest.mock('kolibri-common/components/SafeHTML/style.scss', () => ({}));
jest.mock('kolibri-zip', () => {
  return jest.fn().mockImplementation(() => ({
    file: jest.fn().mockResolvedValue({
      toString: () => '<h1>Mocked HTML content</h1>',
    }),
  }));
});

const renderComponent = () => {
  return render(SafeHtml5RendererIndex);
};

describe('SafeHtml5RendererIndex progress aggregation', () => {
  beforeEach(() => {
    useContentViewer.mockImplementation(() =>
      useContentViewerMock({ defaultFile: { storage_url: 'mock://test.html' } }),
    );
    jest.useFakeTimers();
    mockEmitFromSafeHTML = null;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  async function renderAndLoad() {
    const result = renderComponent();
    await waitFor(() => {
      expect(screen.getByLabelText(articleContent$())).toBeInTheDocument();
    });
    return result;
  }

  function getLastEmittedProgress(emitted) {
    jest.advanceTimersByTime(5000);
    const events = emitted().updateProgress;
    return events[events.length - 1][0];
  }

  // In jsdom, scrollHeight and clientHeight are both 0, so maxScroll = 0
  // and handleScroll sets scrollBasedProgress = 1 (content considered fully read).
  function simulateFullScroll() {
    const wrapper = document.querySelector('[data-testid="safe-html-wrapper"]');
    wrapper.dispatchEvent(new Event('scroll'));
    jest.advanceTimersByTime(150); // flush debounce
  }

  it('reports scroll-based progress when no embedded viewers exist', async () => {
    const { emitted } = await renderAndLoad();
    expect(getLastEmittedProgress(emitted)).toBe(0);
  });

  it('averages scroll and viewer progress with one viewer', async () => {
    const { emitted } = await renderAndLoad();
    mockEmitFromSafeHTML('startTracking', 'viewer-1');
    mockEmitFromSafeHTML('updateProgress', 0.5, 'viewer-1');
    // scroll=0, viewer=0.5, aggregated=(0+0.5)/2=0.25
    expect(getLastEmittedProgress(emitted)).toBe(0.25);
  });

  it('averages scroll and average viewer progress with multiple viewers', async () => {
    const { emitted } = await renderAndLoad();
    mockEmitFromSafeHTML('startTracking', 'viewer-1');
    mockEmitFromSafeHTML('startTracking', 'viewer-2');
    mockEmitFromSafeHTML('updateProgress', 0.25, 'viewer-1');
    mockEmitFromSafeHTML('updateProgress', 0.75, 'viewer-2');
    // scroll=0, viewer avg=(0.25+0.75)/2=0.5, aggregated=(0+0.5)/2=0.25
    expect(getLastEmittedProgress(emitted)).toBe(0.25);
  });

  it('accumulates delta progress via addProgress', async () => {
    const { emitted } = await renderAndLoad();
    mockEmitFromSafeHTML('startTracking', 'viewer-1');
    mockEmitFromSafeHTML('addProgress', 0.25, 'viewer-1');
    mockEmitFromSafeHTML('addProgress', 0.25, 'viewer-1');
    // viewer=0.5, scroll=0, aggregated=(0+0.5)/2=0.25
    expect(getLastEmittedProgress(emitted)).toBe(0.25);
  });

  it('clamps negative progress to 0', async () => {
    const { emitted } = await renderAndLoad();
    mockEmitFromSafeHTML('startTracking', 'viewer-1');
    mockEmitFromSafeHTML('updateProgress', -0.5, 'viewer-1');
    // clamped to 0, aggregated=(0+0)/2=0
    expect(getLastEmittedProgress(emitted)).toBe(0);
  });

  it('clamps progress above 1 to 1', async () => {
    const { emitted } = await renderAndLoad();
    mockEmitFromSafeHTML('startTracking', 'viewer-1');
    mockEmitFromSafeHTML('updateProgress', 1.5, 'viewer-1');
    // clamped to 1, aggregated=(0+1)/2=0.5
    expect(getLastEmittedProgress(emitted)).toBe(0.5);
  });

  it('reverts to scroll-only progress after viewer unregisters', async () => {
    const { emitted } = await renderAndLoad();
    mockEmitFromSafeHTML('startTracking', 'viewer-1');
    mockEmitFromSafeHTML('updateProgress', 0.8, 'viewer-1');
    mockEmitFromSafeHTML('stopTracking', 'viewer-1');
    // no viewers left, progress=scrollBasedProgress=0
    expect(getLastEmittedProgress(emitted)).toBe(0);
  });

  it('does not re-register an already registered viewer', async () => {
    const { emitted } = await renderAndLoad();
    mockEmitFromSafeHTML('startTracking', 'viewer-1');
    mockEmitFromSafeHTML('updateProgress', 0.5, 'viewer-1');
    // Re-registering should not reset progress
    mockEmitFromSafeHTML('startTracking', 'viewer-1');
    // Still one viewer at 0.5, aggregated=(0+0.5)/2=0.25
    expect(getLastEmittedProgress(emitted)).toBe(0.25);
  });

  it('ignores events without a viewerId', async () => {
    const { emitted } = await renderAndLoad();
    mockEmitFromSafeHTML('startTracking', null);
    mockEmitFromSafeHTML('updateProgress', 0.5, null);
    mockEmitFromSafeHTML('addProgress', 0.5, null);
    mockEmitFromSafeHTML('finished', null);
    mockEmitFromSafeHTML('stopTracking', null);
    // No viewers registered, progress=scroll=0
    expect(getLastEmittedProgress(emitted)).toBe(0);
  });

  it('ignores updates to unregistered viewers', async () => {
    const { emitted } = await renderAndLoad();
    mockEmitFromSafeHTML('updateProgress', 0.5, 'unknown');
    mockEmitFromSafeHTML('addProgress', 0.5, 'unknown');
    mockEmitFromSafeHTML('finished', 'unknown');
    // No viewers, progress=scroll=0
    expect(getLastEmittedProgress(emitted)).toBe(0);
  });

  it('does not emit finished when progress is below 1', async () => {
    const { emitted } = await renderAndLoad();
    mockEmitFromSafeHTML('startTracking', 'viewer-1');
    mockEmitFromSafeHTML('updateProgress', 0.5, 'viewer-1');
    jest.advanceTimersByTime(5000);
    expect(emitted().finished).toBeUndefined();
  });

  it('does not emit finished when viewers are incomplete', async () => {
    const { emitted } = await renderAndLoad();
    mockEmitFromSafeHTML('startTracking', 'viewer-1');
    mockEmitFromSafeHTML('updateProgress', 0.5, 'viewer-1');
    simulateFullScroll();
    // scroll=1, viewer=0.5, aggregated=(1+0.5)/2=0.75 and viewer not complete
    expect(emitted().finished).toBeUndefined();
  });

  it('emits finished when scroll is complete and no embedded viewers exist', async () => {
    const { emitted } = await renderAndLoad();
    simulateFullScroll();
    // scroll=1, no viewers, aggregated=1, allSourcesComplete=true
    expect(emitted().finished).toHaveLength(1);
  });

  it('emits finished when scroll is complete and all viewers are finished', async () => {
    const { emitted } = await renderAndLoad();
    mockEmitFromSafeHTML('startTracking', 'viewer-1');
    mockEmitFromSafeHTML('startTracking', 'viewer-2');
    mockEmitFromSafeHTML('finished', 'viewer-1');
    mockEmitFromSafeHTML('finished', 'viewer-2');
    simulateFullScroll();
    // scroll=1, both viewers complete at progress=1
    // aggregated=(1+1)/2=1, allSourcesComplete=true
    expect(emitted().finished).toHaveLength(1);
  });

  it('emits finished only once across multiple recordProgress calls', async () => {
    const { emitted } = await renderAndLoad();
    simulateFullScroll(); // triggers recordProgress via handleScroll
    jest.advanceTimersByTime(5000); // triggers another recordProgress via poll
    jest.advanceTimersByTime(5000); // and another
    expect(emitted().finished).toHaveLength(1);
  });
});
