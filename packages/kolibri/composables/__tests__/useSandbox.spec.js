import { render } from '@testing-library/vue';
import { computed, defineComponent, nextTick, provide, ref } from 'vue';
import { ContentErrorConstants } from 'kolibri/constants';
import { CONTENT_VIEWER_CONTEXT_KEY } from '../../components/internal/ContentViewer';
import useSandbox from '../internal/useSandbox';

// The sandbox client wraps a real iframe and postMessage handshake - stub it and
// drive its event callbacks directly.
const sandboxInstances = [];

jest.mock('kolibri-sandbox', () =>
  jest.fn().mockImplementation(function () {
    this.events = { LOADING: 'loading', ERROR: 'error', NAVIGATETO: 'navigateTo' };
    this.progress = null;
    this.stateUpdateCallback = null;
    this.initialize = jest.fn();
    this.updateData = jest.fn();
    this.destroy = jest.fn();
    this.getProgress = () => this.progress;
    this.on = jest.fn();
    this.onStateUpdate = callback => {
      this.stateUpdateCallback = callback;
    };
    sandboxInstances.push(this);
  }),
);

jest.mock('kolibri/urls', () => ({ sandbox: () => '/sandbox/' }));

let mockHandlerUrl = '/handler.js';

jest.mock('kolibri', () => ({
  __esModule: true,
  default: {
    getSandboxHandlerUrl: preset => (preset === 'html5_zip' ? mockHandlerUrl : null),
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

// Render a component that calls useSandbox against a stubbed ContentViewer context.
// Returns the composable API, an initializer bound to an iframe, the events it
// emitted, the stub sandbox instance, and the refs the session state is read from,
// so a test can change them.
function renderSandbox({
  options = {},
  timeSpent = 0,
  duration = null,
  lang = null,
  file = FILE,
  extraFields = {},
  sandboxOptions = {},
} = {}) {
  const emitted = [];
  let api;
  const session = { progress: ref(0), timeSpent: ref(timeSpent), lang: ref(lang) };
  const iframe = document.createElement('iframe');

  const Child = defineComponent({
    setup() {
      api = useSandbox(
        { emit: (event, payload) => emitted.push([event, payload]) },
        sandboxOptions,
      );
      return () => null;
    },
  });

  const utils = render(
    defineComponent({
      components: { Child },
      setup() {
        provide(CONTENT_VIEWER_CONTEXT_KEY, {
          files: computed(() => (file ? [file] : [])),
          defaultFile: computed(() => file),
          defaultItemPreset: computed(() => 'html5_zip'),
          itemData: computed(() => null),
          itemId: computed(() => null),
          answerState: computed(() => ({})),
          showCorrectAnswer: computed(() => false),
          interactive: computed(() => true),
          lang: computed(() => session.lang.value),
          options: computed(() => options),
          extraFields: computed(() => extraFields),
          userId: computed(() => 'user-id'),
          allowHints: computed(() => true),
          timeSpent: computed(() => session.timeSpent.value),
          duration: computed(() => duration),
          userFullName: computed(() => 'Test User'),
          progress: computed(() => session.progress.value),
          embedded: computed(() => false),
          setCustomExtractors: () => {},
          registerAssessmentApi: () => {},
        });
      },
      template: '<Child />',
    }),
  );

  return {
    api,
    init: () => api.initializeSandbox(iframe),
    emitted,
    utils,
    session,
    sandbox: () => sandboxInstances[sandboxInstances.length - 1],
  };
}

const loadingErrors = emitted =>
  emitted.filter(
    ([event, payload]) =>
      event === 'error' && payload.error === ContentErrorConstants.LOADING_ERROR,
  );

describe('useSandbox', () => {
  beforeEach(() => {
    sandboxInstances.length = 0;
    mockHandlerUrl = '/handler.js';
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('progress reporting', () => {
    it('reports no progress on a state update when the sandbox reports none', () => {
      const { init, emitted, sandbox } = renderSandbox({ timeSpent: 30, duration: 300 });
      init();

      sandbox().progress = null;
      sandbox().stateUpdateCallback({});

      expect(emitted.filter(([event]) => event === 'updateProgress')).toHaveLength(0);
    });

    it('polls duration-based progress when the sandbox reports none', () => {
      jest.useFakeTimers();
      const { init, emitted, utils } = renderSandbox({
        timeSpent: 30,
        duration: 300,
        sandboxOptions: { pollProgress: true },
      });
      init();

      const polls = () => emitted.filter(([event]) => event === 'updateProgress');
      jest.advanceTimersByTime(5000);
      expect(polls()).toEqual([['updateProgress', 0.1]]);

      jest.advanceTimersByTime(5000);
      expect(polls()).toHaveLength(2);

      utils.unmount();
      jest.advanceTimersByTime(5000);
      expect(polls()).toHaveLength(2);
    });

    it('polls time spent over a default duration when the content has none', () => {
      jest.useFakeTimers();
      const { init, emitted } = renderSandbox({
        timeSpent: 30,
        sandboxOptions: { pollProgress: true },
      });
      init();

      jest.advanceTimersByTime(5000);

      expect(emitted.filter(([event]) => event === 'updateProgress')).toEqual([
        ['updateProgress', 0.1],
      ]);
    });

    it('does not poll without pollProgress', () => {
      jest.useFakeTimers();
      const { init, emitted } = renderSandbox({ timeSpent: 30, duration: 300 });
      init();

      jest.advanceTimersByTime(10000);

      expect(emitted.filter(([event]) => event === 'updateProgress')).toHaveLength(0);
    });

    it('does not poll before the sandbox has had an interval to report restored progress', () => {
      // A resumed session's time spent can already exceed the duration, so a poll
      // before the sandbox reports would mark partly-done content complete.
      jest.useFakeTimers();
      const { init, emitted } = renderSandbox({
        timeSpent: 600,
        duration: 300,
        sandboxOptions: { pollProgress: true },
      });
      init();

      jest.advanceTimersByTime(4999);

      expect(emitted.filter(([event]) => event === 'updateProgress')).toHaveLength(0);
      expect(emitted).not.toContainEqual(['finished', undefined]);
    });

    it('prefers the sandbox progress over the duration-based value', () => {
      const { init, emitted, sandbox } = renderSandbox({ timeSpent: 30, duration: 300 });
      init();

      sandbox().progress = 0.5;
      sandbox().stateUpdateCallback({});

      expect(emitted).toContainEqual(['updateProgress', 0.5]);
    });

    it('polls the duration-based value when the content forces duration-based progress', () => {
      jest.useFakeTimers();
      const { init, emitted, sandbox } = renderSandbox({
        options: { force_duration_based_progress: true },
        timeSpent: 30,
        duration: 300,
        sandboxOptions: { pollProgress: true },
      });
      init();

      sandbox().progress = 0.5;
      sandbox().stateUpdateCallback({});
      jest.advanceTimersByTime(5000);

      expect(emitted.filter(([event]) => event === 'updateProgress')).toEqual([
        ['updateProgress', 0.1],
      ]);
    });

    it('emits finished once progress reaches 1', () => {
      const { init, emitted, sandbox } = renderSandbox({ timeSpent: 300, duration: 300 });
      init();

      sandbox().progress = 1;
      sandbox().stateUpdateCallback({});

      expect(emitted).toContainEqual(['finished', undefined]);
    });
  });

  describe('sandbox initialization', () => {
    it('hands the client the content state, user data, url, checksum and handler url', () => {
      const { init, sandbox } = renderSandbox({
        timeSpent: 30,
        duration: 300,
        lang: { id: 'es-ES' },
        extraFields: { contentState: { a: 1 } },
      });
      init();

      expect(sandbox().initialize).toHaveBeenCalledWith(
        { a: 1 },
        {
          userId: 'user-id',
          userFullName: 'Test User',
          progress: 0,
          complete: false,
          language: 'es-ES',
          timeSpent: 30,
        },
        FILE.storage_url,
        FILE.checksum,
        { handlerUrl: '/handler.js' },
      );
    });

    it('builds the content url with urlBuilder when the viewer supplies one', () => {
      const urlBuilder = jest.fn(() => '/zipcontent/abc123/index.html');
      const { init, sandbox } = renderSandbox({
        options: { entry: 'index.html' },
        sandboxOptions: { urlBuilder },
      });
      init();

      expect(urlBuilder).toHaveBeenCalledWith(FILE, { options: { entry: 'index.html' } });
      expect(sandbox().initialize.mock.calls[0][2]).toBe('/zipcontent/abc123/index.html');
    });

    it('starts tracking once the content is handed to the sandbox', () => {
      const { init, emitted } = renderSandbox();
      init();

      expect(emitted).toContainEqual(['startTracking', undefined]);
    });

    it('reports a loading failure when no handler is registered for the preset', () => {
      mockHandlerUrl = null;
      const { init, api, emitted } = renderSandbox();
      init();

      expect(sandboxInstances).toHaveLength(0);
      expect(loadingErrors(emitted)).toHaveLength(1);
      expect(api.loading.value).toBe(false);
      expect(emitted).not.toContainEqual(['startTracking', undefined]);
    });

    it('reports a loading failure when there is no file to load', () => {
      const { init, emitted } = renderSandbox({ file: null });
      init();

      expect(loadingErrors(emitted)).toHaveLength(1);
      expect(emitted).not.toContainEqual(['startTracking', undefined]);
    });
  });

  describe('sandbox events', () => {
    it('emits the content state the sandbox reports', () => {
      const { init, emitted, sandbox } = renderSandbox();
      init();

      sandbox().stateUpdateCallback({ localStorage: { key: 'value' } });

      expect(emitted).toContainEqual(['updateContentState', { localStorage: { key: 'value' } }]);
    });

    it('relays a sandbox error and stops loading', () => {
      const { init, api, emitted, sandbox } = renderSandbox();
      init();
      const error = { message: 'Handler script failed', error: 'HANDLER_ERROR' };

      sandbox().on.mock.calls.find(([name]) => name === 'error')[1](error);

      expect(emitted).toContainEqual(['error', error]);
      expect(api.loading.value).toBe(false);
    });

    it('relays a navigation request from the content', () => {
      const { init, emitted, sandbox } = renderSandbox();
      init();

      sandbox().on.mock.calls.find(([name]) => name === 'navigateTo')[1]({ nodeId: 'abc' });

      expect(emitted).toContainEqual(['navigateTo', { nodeId: 'abc' }]);
    });
  });

  describe('user data', () => {
    it('pushes changed session state to the sandbox', async () => {
      const { init, sandbox, session } = renderSandbox({ lang: { id: 'en' } });
      init();

      session.progress.value = 1;
      session.timeSpent.value = 42;
      session.lang.value = { id: 'es-ES' };
      await nextTick();

      expect(sandbox().updateData).toHaveBeenCalledTimes(1);
      expect(sandbox().updateData).toHaveBeenCalledWith({
        userData: {
          userId: 'user-id',
          userFullName: 'Test User',
          progress: 1,
          complete: true,
          language: 'es-ES',
          timeSpent: 42,
        },
      });
    });
  });

  it('keeps loading, without an error, however long the sandbox takes to signal', () => {
    jest.useFakeTimers();
    const { init, api, emitted, sandbox } = renderSandbox();
    init();

    jest.runOnlyPendingTimers();

    expect(loadingErrors(emitted)).toHaveLength(0);
    expect(api.loading.value).toBe(true);
    expect(sandbox().destroy).not.toHaveBeenCalled();
  });

  it('tears the sandbox down and stops tracking on unmount', () => {
    const { init, emitted, utils, sandbox } = renderSandbox();
    init();
    const instance = sandbox();

    utils.unmount();

    expect(instance.destroy).toHaveBeenCalled();
    expect(emitted).toContainEqual(['stopTracking', undefined]);
  });

  it('does not stop tracking on unmount when tracking never started', () => {
    mockHandlerUrl = null;
    const { init, emitted, utils } = renderSandbox();
    init();

    utils.unmount();

    expect(emitted).not.toContainEqual(['stopTracking', undefined]);
  });
});
