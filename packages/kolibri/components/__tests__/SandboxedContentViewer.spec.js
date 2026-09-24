import { render, screen } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import ScreenFull from 'screenfull';
import { computed, defineComponent, nextTick, provide } from 'vue';
import { viewerToolbarStrings } from 'kolibri/components/ViewerToolbar';
import { ContentErrorConstants } from 'kolibri/constants';
import { CONTENT_VIEWER_CONTEXT_KEY } from '../internal/ContentViewer';
import { createSandboxedContentViewer } from '../SandboxedContentViewer';
import SandboxedContentViewer from '../SandboxedContentViewer/internal/SandboxedContentViewer';
import { sandboxedContentViewerStrings } from '../SandboxedContentViewer/internal/setup';

const sandboxInstances = [];

jest.mock('kolibri-sandbox', () =>
  jest.fn().mockImplementation(function () {
    this.events = jest.requireActual('kolibri-sandbox/base').events;
    this.initialize = jest.fn();
    this.updateData = jest.fn();
    this.destroy = jest.fn();
    this.getProgress = () => null;
    this.on = jest.fn(eventName => {
      if (!Object.values(this.events).includes(eventName)) {
        throw new ReferenceError(`${eventName} is not a valid event`);
      }
    });
    this.onStateUpdate = jest.fn();
    sandboxInstances.push(this);
  }),
);

jest.mock('kolibri/urls', () => ({ sandbox: () => '/sandbox/' }));

jest.mock('screenfull', () => ({
  isEnabled: true,
  isFullscreen: false,
  toggle: jest.fn(() => Promise.resolve()),
  on: jest.fn(),
  off: jest.fn(),
}));

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

function renderViewer(component = SandboxedContentViewer) {
  const onError = jest.fn();
  const onStartTracking = jest.fn();
  const rendered = render(
    defineComponent({
      components: { SandboxedContentViewer: component },
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
        return { onError, onStartTracking };
      },
      template: '<SandboxedContentViewer @error="onError" @startTracking="onStartTracking" />',
    }),
  );
  return { ...rendered, onError, onStartTracking };
}

describe('SandboxedContentViewer', () => {
  beforeEach(() => {
    sandboxInstances.length = 0;
  });

  afterEach(() => {
    mockHandlerUrl = '/handler.js';
    jest.clearAllMocks();
  });

  it('renders the sandbox iframe', () => {
    renderViewer();

    const iframe = screen.getByTitle(sandboxedContentViewerStrings.contentFrameTitle$());
    expect(iframe).toHaveAttribute('src', '/sandbox/');
    expect(iframe).toHaveAttribute('sandbox', 'allow-scripts allow-same-origin');
  });

  it('offers a fullscreen toggle', async () => {
    renderViewer();

    await userEvent.click(
      screen.getByRole('button', { name: viewerToolbarStrings.enterFullscreen$() }),
    );

    expect(ScreenFull.toggle).toHaveBeenCalledTimes(1);
  });

  it('starts tracking once the sandbox is initialized', async () => {
    const { onStartTracking } = renderViewer();
    await nextTick();

    expect(sandboxInstances[0].initialize).toHaveBeenCalled();
    expect(onStartTracking).toHaveBeenCalled();
  });

  it('reports an error and stops loading when no handler is registered for the preset', async () => {
    mockHandlerUrl = null;

    const { onError, onStartTracking } = renderViewer();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    await nextTick();

    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ error: ContentErrorConstants.LOADING_ERROR }),
    );
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    expect(onStartTracking).not.toHaveBeenCalled();
  });

  it('gives the sandbox the url the factory options build, not the raw file', async () => {
    // The factory is the only production path that supplies options: a viewer built
    // through it must reach the content's entry point, not the zip itself.
    const viewer = createSandboxedContentViewer({
      urlBuilder: () => '/zipcontent/abc123/index.html',
    });

    renderViewer(viewer);
    await nextTick();

    expect(sandboxInstances[0].initialize.mock.calls[0][2]).toBe('/zipcontent/abc123/index.html');
  });
});
