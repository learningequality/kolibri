import { render, screen } from '@testing-library/vue';
import { computed, defineComponent, nextTick, provide } from 'vue';
import { viewerToolbarStrings } from 'kolibri/components/ViewerToolbar';
import { ContentErrorConstants } from 'kolibri/constants';
import { CONTENT_VIEWER_CONTEXT_KEY } from '../internal/ContentViewer';
import SandboxedContentViewer from '../SandboxedContentViewer/internal/SandboxedContentViewer';

jest.mock('kolibri-sandbox', () =>
  jest.fn().mockImplementation(function () {
    this.events = { LOADING: 'loading', ERROR: 'error' };
    this.initialize = jest.fn();
    this.updateData = jest.fn();
    this.destroy = jest.fn();
    this.getProgress = () => null;
    this.on = jest.fn();
    this.onStateUpdate = jest.fn();
  }),
);

jest.mock('kolibri/urls', () => ({ sandbox: () => '/sandbox/' }));

let mockHandlerUrl = '/handler.js';

jest.mock('kolibri', () => ({
  __esModule: true,
  default: {
    getSandboxHandlerUrl: () => mockHandlerUrl,
    presetViewerComponent: () => ({ name: 'StubViewer', render: h => h('div') }),
  },
}));

const FILE = {
  storage_url: '/content/file.zip',
  checksum: 'abc123',
  preset: 'html5_zip',
  available: true,
  supplementary: false,
  thumbnail: false,
};

function renderViewer() {
  const onError = jest.fn();
  const rendered = render(
    defineComponent({
      components: { SandboxedContentViewer },
      setup() {
        provide(CONTENT_VIEWER_CONTEXT_KEY, {
          files: computed(() => [FILE]),
          defaultFile: computed(() => FILE),
          defaultItemPreset: computed(() => 'html5_zip'),
          itemData: computed(() => null),
          itemId: computed(() => null),
          answerState: computed(() => ({})),
          showCorrectAnswer: computed(() => false),
          interactive: computed(() => true),
          lang: computed(() => null),
          options: computed(() => ({})),
          extraFields: computed(() => ({})),
          userId: computed(() => 'user-id'),
          allowHints: computed(() => true),
          timeSpent: computed(() => 0),
          duration: computed(() => null),
          userFullName: computed(() => 'Test User'),
          progress: computed(() => 0),
          embedded: computed(() => false),
          setCustomExtractors: () => {},
          registerAssessmentApi: () => {},
        });
        return { onError };
      },
      template: '<SandboxedContentViewer @error="onError" />',
    }),
  );
  return { ...rendered, onError };
}

describe('SandboxedContentViewer', () => {
  afterEach(() => {
    mockHandlerUrl = '/handler.js';
  });

  it('renders the sandbox iframe', () => {
    const { container } = renderViewer();

    const iframe = container.querySelector('iframe');
    expect(iframe).toBeTruthy();
    expect(iframe).toHaveAttribute('src', '/sandbox/');
    expect(iframe).toHaveAttribute('sandbox', 'allow-scripts allow-same-origin');
  });

  it('offers a fullscreen toggle', () => {
    renderViewer();

    expect(
      screen.getByRole('button', { name: viewerToolbarStrings.enterFullscreen$() }),
    ).toBeInTheDocument();
  });

  it('reports an error and stops loading when no handler is registered for the preset', async () => {
    mockHandlerUrl = null;

    const { onError, container } = renderViewer();
    await nextTick();

    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ error: ContentErrorConstants.LOADING_ERROR }),
    );
    expect(container.querySelector('.loader')).toBeNull();
  });
});
