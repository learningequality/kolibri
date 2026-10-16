import { render, screen } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import ScreenFull from 'screenfull';
import { computed, defineComponent, nextTick, provide } from 'vue';
import { viewerToolbarStrings } from 'kolibri/components/ViewerToolbar';
import { coreStrings } from 'kolibri/uiText/commonCoreStrings';
import { ContentErrorConstants } from 'kolibri/constants';
import { crossComponentTranslator } from 'kolibri/utils/i18n';
import AppError from 'kolibri/components/error/AppError';
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
    this.callbacks = {};
    this.on = jest.fn((eventName, callback) => {
      if (!Object.values(this.events).includes(eventName)) {
        throw new ReferenceError(`${eventName} is not a valid event`);
      }
      this.callbacks[eventName] = [...(this.callbacks[eventName] || []), callback];
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

jest.mock('kolibri', () => {
  const StubFileViewer = {
    name: 'StubFileViewer',
    setup(props, { emit }) {
      const { h, inject, onMounted } = require('vue');
      const { CONTENT_VIEWER_CONTEXT_KEY } = require('../internal/ContentViewer');
      const { progress, element } = inject(CONTENT_VIEWER_CONTEXT_KEY);
      const loadedFrom =
        element.value.getAttribute('data') ||
        element.value.querySelector('source')?.getAttribute('src');
      const loadErrors = {
        video: 'No compatible source was found.',
        audio: undefined,
        object: new Error('Invalid PDF structure.'),
      };
      onMounted(() => {
        if (loadedFrom.includes('corrupt')) {
          const message = loadErrors[element.value.tagName.toLowerCase()];
          emit('error', { message, error: 'LOADING_ERROR' });
          return;
        }
        emit('updateProgress', 0.5);
        emit('addProgress', 0.5);
        emit('updateContentState', { page: 2 });
        emit('finished');
      });
      return () =>
        h('div', {
          attrs: {
            'data-testid': 'file-viewer',
            'data-progress': progress.value,
            'data-loaded-from': loadedFrom,
          },
        });
    },
  };
  return {
    __esModule: true,
    default: {
      getSandboxHandlerUrl: () => mockHandlerUrl,
      presetViewerComponent: () => ({ name: 'StubViewer', render: h => h('div') }),
      canHandleElement: () => true,
      objectViewerMimetypes: () => ['application/pdf'],
      elementViewerComponent: () => StubFileViewer,
    },
  };
});

const FILE = {
  storage_url: '/content/file.zip',
  checksum: 'abc123',
  preset: 'html5_zip',
  available: true,
  supplementary: false,
  thumbnail: false,
};

function renderViewer(component = SandboxedContentViewer, { listen = [] } = {}) {
  const listeners = {
    error: jest.fn(),
    startTracking: jest.fn(),
    updateProgress: jest.fn(),
    addProgress: jest.fn(),
    updateContentState: jest.fn(),
    finished: jest.fn(),
  };
  for (const event of listen) {
    listeners[event] = jest.fn();
  }
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
          progress: computed(() => 0.25),
          embedded: computed(() => false),
          setCustomExtractors: () => {},
          registerAssessmentApi: () => {},
        });
        return { listeners };
      },
      template: '<SandboxedContentViewer v-on="listeners" />',
    }),
  );
  return {
    ...rendered,
    listeners,
    onError: listeners.error,
    onStartTracking: listeners.startTracking,
  };
}

describe('SandboxedContentViewer', () => {
  beforeEach(() => {
    sandboxInstances.length = 0;
  });

  afterEach(() => {
    mockHandlerUrl = '/handler.js';
    ScreenFull.isEnabled = true;
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

    function fromSandbox(event, data) {
      const sandbox = sandboxInstances[0];
      for (const callback of sandbox.callbacks[sandbox.events[event]] || []) {
        callback(data);
      }
    }

    async function renderFile(file) {
      fromSandbox('RENDER_FILE', file);
      await nextTick();
    }

    async function finishLoading() {
      fromSandbox('LOADING', false);
      await nextTick();
    }

    async function reportFileOverlay(open) {
      fromSandbox('FILE_OVERLAY', open);
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

    const firstPage = {
      mimetype: 'application/pdf',
      data: new Uint8Array([1]),
      hasPrevious: false,
    };
    const laterPage = { mimetype: 'application/pdf', data: new Uint8Array([1]), hasPrevious: true };

    it.each([
      ['after it arrives', [() => renderFile(firstPage), finishLoading]],
      ['before it arrives', [finishLoading, () => renderFile(firstPage)]],
    ])('offers no way back from a file with no page before it, loading %s', async (_, steps) => {
      renderFileViewer();
      await nextTick();

      for (const step of steps) {
        await step();
      }

      expect(
        screen.queryByRole('button', { name: coreStrings.goBackAction$() }),
      ).not.toBeInTheDocument();
    });

    it('moves focus to a file with no page before it', async () => {
      renderFileViewer();
      await nextTick();

      await renderFile(firstPage);
      await nextTick();

      expect(document.body).not.toHaveFocus();
      expect(document.activeElement).toContainElement(screen.getByTestId('file-viewer'));
    });

    it('moves focus to the next file when the back button it was on goes away', async () => {
      renderFileViewer();
      await nextTick();
      await renderFile(laterPage);
      await nextTick();
      expect(screen.getByRole('button', { name: coreStrings.goBackAction$() })).toHaveFocus();

      URL.createObjectURL.mockReturnValueOnce('blob:main/1');
      await renderFile(firstPage);
      await nextTick();

      expect(document.body).not.toHaveFocus();
      expect(document.activeElement).toContainElement(screen.getByTestId('file-viewer'));
    });

    it('leaves fullscreen to the viewer of a file it shows', async () => {
      renderFileViewer();
      await nextTick();

      await renderFile(firstPage);

      expect(
        screen.queryByRole('button', { name: viewerToolbarStrings.enterFullscreen$() }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: viewerToolbarStrings.exitFullscreen$() }),
      ).not.toBeInTheDocument();
    });

    it('leaves fullscreen when it shows a file in a viewer with its own', async () => {
      ScreenFull.isEnabled = false;
      renderFileViewer();
      await nextTick();
      await userEvent.click(
        screen.getByRole('button', { name: viewerToolbarStrings.enterFullscreen$() }),
      );
      expect(
        await screen.findByRole('button', { name: viewerToolbarStrings.exitFullscreen$() }),
      ).toBeVisible();

      await renderFile(laterPage);
      await userEvent.click(screen.getByRole('button', { name: coreStrings.goBackAction$() }));

      expect(
        await screen.findByRole('button', { name: viewerToolbarStrings.enterFullscreen$() }),
      ).toBeVisible();
    });

    it('stays in fullscreen when it shows audio, whose player has none of its own', async () => {
      ScreenFull.isEnabled = false;
      renderFileViewer();
      await nextTick();
      await userEvent.click(
        screen.getByRole('button', { name: viewerToolbarStrings.enterFullscreen$() }),
      );
      await screen.findByRole('button', { name: viewerToolbarStrings.exitFullscreen$() });

      await renderFile({ mimetype: 'audio/mpeg', data: new Uint8Array([1]), hasPrevious: true });
      await nextTick();

      expect(
        screen.getByRole('button', { name: viewerToolbarStrings.exitFullscreen$() }),
      ).toBeVisible();
    });

    it('keeps the fullscreen toggle while an image is shown', async () => {
      renderFileViewer();
      await nextTick();

      await renderFile({ mimetype: 'image/png', data: new Uint8Array([1]), name: 'Pic.png' });

      expect(
        screen.getByRole('button', { name: viewerToolbarStrings.enterFullscreen$() }),
      ).toBeVisible();
    });

    it('keeps the fullscreen toggle while the content shows a file over itself', async () => {
      renderFileViewer();
      await nextTick();

      await reportFileOverlay(true);

      expect(
        screen.getByRole('button', { name: viewerToolbarStrings.enterFullscreen$() }),
      ).toBeVisible();
    });

    it('is not taken from content whose viewer does not render files', async () => {
      renderViewer();
      await nextTick();

      const image = { mimetype: 'image/png', data: new Uint8Array([1]), name: 'Pic.png' };
      await renderFile({ mimetype: 'application/pdf', data: new Uint8Array([1]) });
      await renderFile(image);

      expect(screen.queryByTestId('file-viewer')).not.toBeInTheDocument();
      expect(screen.queryByAltText(image.name)).not.toBeInTheDocument();
      expect(screen.getByTitle(sandboxedContentViewerStrings.contentFrameTitle$())).toBeVisible();
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

    it('shows it with a Kolibri viewer in place of the sandbox', async () => {
      renderFileViewer();
      await nextTick();

      await renderFile({ mimetype: 'application/pdf', data: new Uint8Array([1]) });

      expect(screen.getByTestId('file-viewer')).toBeInTheDocument();
      expect(
        screen.getByTitle(sandboxedContentViewerStrings.contentFrameTitle$()),
      ).not.toBeVisible();
    });

    it("keeps the file viewer out of the content's own session", async () => {
      const { listeners } = renderFileViewer();
      await nextTick();

      await renderFile({ mimetype: 'application/pdf', data: new Uint8Array([1]) });

      expect(screen.getByTestId('file-viewer')).toHaveAttribute('data-progress', '0');
      expect(listeners.updateProgress).not.toHaveBeenCalled();
      expect(listeners.addProgress).not.toHaveBeenCalled();
      expect(listeners.updateContentState).not.toHaveBeenCalled();
      expect(listeners.finished).not.toHaveBeenCalled();
    });

    async function renderBrokenFile(mimetype) {
      URL.createObjectURL.mockReturnValueOnce('blob:main/corrupt');
      await renderFile({ mimetype, data: new Uint8Array([1]), hasPrevious: true });
      await nextTick();
    }

    const brokenFiles = [
      ['video/webm', 'No compatible source was found.'],
      ['application/pdf', 'Error: Invalid PDF structure.'],
    ];

    it.each(brokenFiles)(
      "shows a %s viewer's error in place of the file, not as the content's own",
      async mimetype => {
        const { listeners } = renderFileViewer();
        await nextTick();

        await renderBrokenFile(mimetype);

        expect(screen.getByRole('alert')).toBeVisible();
        expect(listeners.error).not.toHaveBeenCalled();
      },
    );

    it.each(brokenFiles)(
      "opens the report dialog for a %s viewer's error, keeping the content around it",
      async (mimetype, details) => {
        renderFileViewer();
        await nextTick();
        await renderBrokenFile(mimetype);

        await userEvent.click(
          screen.getByText(crossComponentTranslator(AppError).$tr('defaultErrorReportPrompt')),
        );

        expect(screen.getByRole('dialog')).toHaveTextContent(details);
        expect(screen.getByRole('button', { name: coreStrings.goBackAction$() })).toBeVisible();
      },
    );

    it("shows a file viewer's error without details, offering no report of them", async () => {
      renderFileViewer();
      await nextTick();

      await renderBrokenFile('audio/mpeg');

      expect(screen.getByRole('alert')).toBeVisible();
      expect(
        screen.queryByText(crossComponentTranslator(AppError).$tr('defaultErrorReportPrompt')),
      ).not.toBeInTheDocument();
    });

    it('clears a file viewer error when the next file arrives', async () => {
      renderFileViewer();
      await nextTick();
      await renderBrokenFile('application/pdf');

      URL.createObjectURL.mockReturnValueOnce('blob:main/1');
      await renderFile(laterPage);

      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      expect(screen.getByTestId('file-viewer')).toBeInTheDocument();
    });

    it('loads each file in a fresh viewer when one replaces another', async () => {
      renderFileViewer();
      await nextTick();
      await renderFile(laterPage);

      URL.createObjectURL.mockReturnValueOnce('blob:main/1');
      await renderFile(laterPage);

      expect(screen.getByTestId('file-viewer')).toHaveAttribute('data-loaded-from', 'blob:main/1');
    });

    it('shows an image directly', async () => {
      renderFileViewer();
      await nextTick();

      const file = { mimetype: 'image/png', data: new Uint8Array([1]), name: 'Pic.png' };
      await renderFile(file);

      expect(screen.getByAltText(file.name)).toHaveAttribute('src', 'blob:main/0');
      expect(screen.queryByTestId('file-viewer')).not.toBeInTheDocument();
    });

    it('names an image the content sends without a name', async () => {
      renderFileViewer();
      await nextTick();

      await renderFile({ mimetype: 'image/png', data: new Uint8Array([1]) });

      expect(
        screen.getByRole('img', { name: sandboxedContentViewerStrings.renderedImageLabel$() }),
      ).toHaveAttribute('src', 'blob:main/0');
    });

    it('keeps the outgoing file loadable until it has left the page', async () => {
      const shownWhenRevoked = [];
      URL.revokeObjectURL = jest.fn(url =>
        shownWhenRevoked.push(Boolean(document.querySelector(`[src="${url}"]`))),
      );
      renderFileViewer();
      await nextTick();
      await renderFile({ mimetype: 'image/png', data: new Uint8Array([1]), name: 'Pic.png' });

      await renderFile(null);

      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:main/0');
      expect(shownWhenRevoked).toEqual([false]);
    });

    it('goes back from an image to the sandbox content', async () => {
      renderFileViewer();
      await nextTick();
      const file = {
        mimetype: 'image/png',
        data: new Uint8Array([1]),
        name: 'Pic.png',
        hasPrevious: true,
      };
      await renderFile(file);

      await userEvent.click(screen.getByRole('button', { name: coreStrings.goBackAction$() }));

      expect(screen.queryByAltText(file.name)).not.toBeInTheDocument();
      expect(screen.getByTitle(sandboxedContentViewerStrings.contentFrameTitle$())).toBeVisible();
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:main/0');
      expect(sandboxInstances[0].closeFile).toHaveBeenCalledTimes(1);
    });

    it('leaves going back from a file shown as a page to a host that handles it', async () => {
      const { listeners } = renderFileViewer({ listen: ['goBack'] });
      await nextTick();
      await renderFile(laterPage);

      await userEvent.click(screen.getByRole('button', { name: coreStrings.goBackAction$() }));

      expect(listeners.goBack).toHaveBeenCalledTimes(1);
      expect(sandboxInstances[0].closeFile).not.toHaveBeenCalled();
      expect(screen.getByTestId('file-viewer')).toBeInTheDocument();
    });

    it.each([
      ['listens to nothing, e.g. a preview', []],
      ['only follows which page shows', ['nowShowing']],
    ])('closes a file shown as a page itself when its host %s', async (_, listen) => {
      renderFileViewer({ listen });
      await nextTick();
      await renderFile(laterPage);

      await userEvent.click(screen.getByRole('button', { name: coreStrings.goBackAction$() }));

      expect(sandboxInstances[0].closeFile).toHaveBeenCalledTimes(1);
      expect(screen.queryByTestId('file-viewer')).not.toBeInTheDocument();
      expect(screen.getByTitle(sandboxedContentViewerStrings.contentFrameTitle$())).toBeVisible();
    });

    it('moves focus to the back button when a file shown as a page opens', async () => {
      renderFileViewer();
      await nextTick();

      await renderFile(laterPage);
      await nextTick();

      expect(screen.getByRole('button', { name: coreStrings.goBackAction$() })).toHaveFocus();
    });

    const imageOverPage = {
      mimetype: 'image/png',
      data: new Uint8Array([1]),
      name: 'Pic.png',
      hasPrevious: true,
    };

    it('moves focus to the back button when an image opens', async () => {
      renderFileViewer();
      await nextTick();

      await renderFile(imageOverPage);
      await nextTick();

      expect(screen.getByRole('button', { name: coreStrings.goBackAction$() })).toHaveFocus();
    });

    it('returns focus to the sandbox content when going back from an image', async () => {
      renderFileViewer();
      await nextTick();
      await renderFile(imageOverPage);

      await userEvent.click(screen.getByRole('button', { name: coreStrings.goBackAction$() }));
      await nextTick();

      expect(screen.getByTitle(sandboxedContentViewerStrings.contentFrameTitle$())).toHaveFocus();
    });

    describe("with focus in the host's own controls", () => {
      let hostControl;
      beforeEach(() => {
        hostControl = document.createElement('button');
        document.body.appendChild(hostControl);
      });
      afterEach(() => {
        hostControl.remove();
      });

      it('leaves it there when a file opens', async () => {
        renderFileViewer();
        await nextTick();
        hostControl.focus();

        await renderFile(laterPage);
        await nextTick();

        expect(hostControl).toHaveFocus();
      });

      it('leaves it there when the content closes its file', async () => {
        renderFileViewer();
        await nextTick();
        await renderFile(laterPage);
        await nextTick();
        hostControl.focus();

        await renderFile(null);
        await nextTick();

        expect(hostControl).toHaveFocus();
      });
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
