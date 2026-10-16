import { render, screen } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import ScreenFull from 'screenfull';
import router from 'kolibri/router';
import { computed, defineComponent, nextTick, provide } from 'vue';
import { viewerToolbarStrings } from 'kolibri/components/ViewerToolbar';
import { coreStrings } from 'kolibri/uiText/commonCoreStrings';
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
    this.closeFile = jest.fn();
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

jest.mock('kolibri/router', () => ({ back: jest.fn() }));

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
    canHandleElement: () => true,
    objectViewerMimetypes: () => ['application/pdf'],
    elementViewerComponent: () => ({
      name: 'StubFileViewer',
      mounted() {
        this.$emit('updateProgress', 0.5);
      },
      render: h => h('div', { attrs: { 'data-testid': 'file-viewer' } }),
    }),
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

function renderViewer(component = SandboxedContentViewer, { routesPages = false } = {}) {
  const onNowShowing = routesPages ? jest.fn() : undefined;
  const onError = jest.fn();
  const onStartTracking = jest.fn();
  const onUpdateProgress = jest.fn();
  const rendered = render(
    defineComponent({
      components: { SandboxedContentViewer: component },
      setup() {
        provide(CONTENT_VIEWER_CONTEXT_KEY, {
          contentNode: computed(() => null),
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
        return { onError, onStartTracking, onUpdateProgress, onNowShowing };
      },
      template: routesPages
        ? '<SandboxedContentViewer @error="onError" @startTracking="onStartTracking" @updateProgress="onUpdateProgress" @nowShowing="onNowShowing" />'
        : '<SandboxedContentViewer @error="onError" @startTracking="onStartTracking" @updateProgress="onUpdateProgress" />',
    }),
  );
  return { ...rendered, onError, onStartTracking, onUpdateProgress };
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

  describe('a file the content asks Kolibri to render', () => {
    beforeEach(() => {
      URL.createObjectURL = jest.fn(() => 'blob:main/0');
      URL.revokeObjectURL = jest.fn();
    });

    function renderFileViewer(options) {
      return renderViewer(createSandboxedContentViewer({ renderFiles: true }), options);
    }

    function renderFileHandler() {
      const call = sandboxInstances[0].on.mock.calls.find(
        ([name]) => name === sandboxInstances[0].events.RENDER_FILE,
      );
      return call && call[1];
    }

    async function renderFile(file) {
      renderFileHandler()(file);
      await nextTick();
    }

    async function finishLoading() {
      const [, callback] = sandboxInstances[0].on.mock.calls.find(
        ([name]) => name === sandboxInstances[0].events.LOADING,
      );
      callback(false);
      await nextTick();
    }

    async function reportFileOverlay(open) {
      const [, callback] = sandboxInstances[0].on.mock.calls.find(
        ([name]) => name === sandboxInstances[0].events.FILE_OVERLAY,
      );
      callback(open);
      await nextTick();
      await nextTick();
    }

    it('offers a way back from a file the content shows itself, over the article', async () => {
      renderFileViewer();
      await nextTick();

      await reportFileOverlay(true);
      const back = screen.getByRole('button', { name: coreStrings.goBackAction$() });
      expect(back).toHaveFocus();
      expect(screen.getByTitle(sandboxedContentViewerStrings.contentFrameTitle$())).toBeVisible();

      await userEvent.click(back);
      await nextTick();

      expect(sandboxInstances[0].closeFile).toHaveBeenCalledTimes(1);
      expect(
        screen.queryByRole('button', { name: coreStrings.goBackAction$() }),
      ).not.toBeInTheDocument();
      expect(screen.getByTitle(sandboxedContentViewerStrings.contentFrameTitle$())).toHaveFocus();
    });

    it('drops the way back when the content closes its file itself', async () => {
      renderFileViewer();
      await nextTick();
      await reportFileOverlay(true);

      await reportFileOverlay(false);

      expect(
        screen.queryByRole('button', { name: coreStrings.goBackAction$() }),
      ).not.toBeInTheDocument();
    });

    it('offers no way back from a file shown as the first page, which has none before it', async () => {
      renderFileViewer();
      await nextTick();

      await renderFile({ mimetype: 'application/pdf', data: new Uint8Array([1]) });
      await finishLoading();

      expect(
        screen.queryByRole('button', { name: coreStrings.goBackAction$() }),
      ).not.toBeInTheDocument();
    });

    it('is not taken from content whose viewer does not render files', async () => {
      renderViewer();
      await nextTick();

      expect(renderFileHandler()).toBeUndefined();
    });

    it('does not show an SVG, which could run script on the Kolibri origin', async () => {
      renderFileViewer();
      await nextTick();

      const file = { mimetype: 'image/svg+xml', data: new Uint8Array([1]), name: 'Pic.svg' };
      await renderFile(file);

      expect(screen.queryByAltText(file.name)).not.toBeInTheDocument();
      expect(screen.getByTitle(sandboxedContentViewerStrings.contentFrameTitle$())).toBeVisible();
      expect(URL.createObjectURL).not.toHaveBeenCalled();
    });

    it('shows it with a Kolibri viewer in place of the sandbox, and relays its progress', async () => {
      const { onUpdateProgress } = renderFileViewer();
      await nextTick();

      await renderFile({ mimetype: 'application/pdf', data: new Uint8Array([1]) });

      expect(screen.getByTestId('file-viewer')).toBeInTheDocument();
      expect(
        screen.getByTitle(sandboxedContentViewerStrings.contentFrameTitle$()),
      ).not.toBeVisible();
      expect(onUpdateProgress).toHaveBeenCalledWith(0.5);
    });

    it('shows an image directly', async () => {
      renderFileViewer();
      await nextTick();

      const file = { mimetype: 'image/png', data: new Uint8Array([1]), name: 'Pic.png' };
      await renderFile(file);

      expect(screen.getByAltText(file.name)).toHaveAttribute('src', 'blob:main/0');
      expect(screen.queryByTestId('file-viewer')).not.toBeInTheDocument();
    });

    it('goes back from an image to the sandbox content', async () => {
      renderFileViewer();
      await nextTick();
      const file = { mimetype: 'image/png', data: new Uint8Array([1]), name: 'Pic.png' };
      await renderFile(file);

      await userEvent.click(screen.getByRole('button', { name: coreStrings.goBackAction$() }));

      expect(screen.queryByAltText(file.name)).not.toBeInTheDocument();
      expect(screen.getByTitle(sandboxedContentViewerStrings.contentFrameTitle$())).toBeVisible();
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:main/0');
    });

    it('goes back from a file shown as a page to the page before it', async () => {
      renderFileViewer({ routesPages: true });
      await nextTick();
      await finishLoading();
      await renderFile({ mimetype: 'application/pdf', data: new Uint8Array([1]) });

      await userEvent.click(screen.getByRole('button', { name: coreStrings.goBackAction$() }));

      expect(router.back).toHaveBeenCalledTimes(1);
    });

    it('closes a file shown as a page when its host does not route pages, e.g. a preview', async () => {
      renderFileViewer();
      await nextTick();
      await finishLoading();
      await renderFile({ mimetype: 'application/pdf', data: new Uint8Array([1]) });

      await userEvent.click(screen.getByRole('button', { name: coreStrings.goBackAction$() }));

      expect(router.back).not.toHaveBeenCalled();
      expect(sandboxInstances[0].closeFile).toHaveBeenCalledTimes(1);
      expect(screen.queryByTestId('file-viewer')).not.toBeInTheDocument();
      expect(screen.getByTitle(sandboxedContentViewerStrings.contentFrameTitle$())).toBeVisible();
    });

    it('moves focus to the back button when a file shown as a page opens', async () => {
      renderFileViewer();
      await nextTick();
      await finishLoading();

      await renderFile({ mimetype: 'application/pdf', data: new Uint8Array([1]) });
      await nextTick();

      expect(screen.getByRole('button', { name: coreStrings.goBackAction$() })).toHaveFocus();
    });

    it('moves focus to the back button when an image opens', async () => {
      renderFileViewer();
      await nextTick();

      await renderFile({ mimetype: 'image/png', data: new Uint8Array([1]), name: 'Pic.png' });
      await nextTick();

      expect(screen.getByRole('button', { name: coreStrings.goBackAction$() })).toHaveFocus();
    });

    it('returns focus to the sandbox content when going back from an image', async () => {
      renderFileViewer();
      await nextTick();
      await renderFile({ mimetype: 'image/png', data: new Uint8Array([1]), name: 'Pic.png' });

      await userEvent.click(screen.getByRole('button', { name: coreStrings.goBackAction$() }));
      await nextTick();

      expect(screen.getByTitle(sandboxedContentViewerStrings.contentFrameTitle$())).toHaveFocus();
    });

    it('returns to the sandbox content, which kept running, when cleared', async () => {
      renderFileViewer();
      await nextTick();
      await renderFile({ mimetype: 'application/pdf', data: new Uint8Array([1]) });

      await renderFile(null);

      expect(screen.queryByTestId('file-viewer')).not.toBeInTheDocument();
      expect(screen.getByTitle(sandboxedContentViewerStrings.contentFrameTitle$())).toBeVisible();
      expect(sandboxInstances).toHaveLength(1);
    });
  });
});
