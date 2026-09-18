import { render } from '@testing-library/vue';
import { computed, defineComponent, provide } from 'vue';
import { CONTENT_VIEWER_CONTEXT_KEY } from '../../components/internal/ContentViewer';
import useSandbox from '../internal/useSandbox';

// The sandbox client wraps a real iframe and postMessage handshake - stub it and
// drive its event callbacks directly.
const sandboxInstances = [];

jest.mock('kolibri-sandbox', () =>
  jest.fn().mockImplementation(function () {
    this.events = { LOADING: 'loading', ERROR: 'error' };
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

jest.mock('kolibri', () => ({
  __esModule: true,
  default: {
    getSandboxHandlerUrl: () => '/handler.js',
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
// Returns the composable API, the events it emitted, and the stub sandbox instance.
function renderSandbox({ options = {}, timeSpent = 0, duration = null, sandboxOptions = {} } = {}) {
  const emitted = [];
  let api;

  const Child = defineComponent({
    setup() {
      api = useSandbox(
        { emit: (event, payload) => emitted.push([event, payload]) },
        sandboxOptions,
      );
      api.iframeRef.value = document.createElement('iframe');
      return () => null;
    },
  });

  const utils = render(
    defineComponent({
      components: { Child },
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
          options: computed(() => options),
          extraFields: computed(() => ({})),
          userId: computed(() => 'user-id'),
          allowHints: computed(() => true),
          timeSpent: computed(() => timeSpent),
          duration: computed(() => duration),
          userFullName: computed(() => 'Test User'),
          progress: computed(() => 0),
          embedded: computed(() => false),
          setCustomExtractors: () => {},
          registerAssessmentApi: () => {},
        });
      },
      template: '<Child />',
    }),
  );

  return { api, emitted, utils, sandbox: () => sandboxInstances[sandboxInstances.length - 1] };
}

describe('useSandbox', () => {
  beforeEach(() => {
    sandboxInstances.length = 0;
  });

  describe('progress reporting', () => {
    it('reports no progress on a state update when the sandbox reports none', async () => {
      const { api, emitted, sandbox } = renderSandbox({ timeSpent: 30, duration: 300 });
      await api.initializeSandbox();

      sandbox().progress = null;
      sandbox().stateUpdateCallback({});

      expect(emitted.filter(([event]) => event === 'updateProgress')).toHaveLength(0);
    });

    it('falls back to duration-based progress when polling and the sandbox reports none', async () => {
      const { api, emitted, utils } = renderSandbox({
        timeSpent: 30,
        duration: 300,
        sandboxOptions: { progressPollingInterval: 5000 },
      });
      await api.initializeSandbox();
      utils.unmount();

      expect(emitted).toContainEqual(['updateProgress', 0.1]);
    });

    it('prefers the sandbox progress over the duration-based value', async () => {
      const { api, emitted, sandbox } = renderSandbox({ timeSpent: 30, duration: 300 });
      await api.initializeSandbox();

      sandbox().progress = 0.5;
      sandbox().stateUpdateCallback({});

      expect(emitted).toContainEqual(['updateProgress', 0.5]);
    });

    it('ignores the sandbox progress when the content forces duration-based progress', async () => {
      const { api, emitted, sandbox } = renderSandbox({
        options: { force_duration_based_progress: true },
        timeSpent: 30,
        duration: 300,
      });
      await api.initializeSandbox();

      sandbox().progress = 0.5;
      sandbox().stateUpdateCallback({});

      expect(emitted).not.toContainEqual(['updateProgress', 0.5]);
    });

    it('emits finished once progress reaches 1', async () => {
      const { api, emitted, sandbox } = renderSandbox({ timeSpent: 300, duration: 300 });
      await api.initializeSandbox();

      sandbox().progress = 1;
      sandbox().stateUpdateCallback({});

      expect(emitted).toContainEqual(['finished', undefined]);
    });

    it('emits nothing when neither the sandbox nor a duration gives progress', async () => {
      const { api, emitted, sandbox } = renderSandbox();
      await api.initializeSandbox();

      sandbox().progress = null;
      sandbox().stateUpdateCallback({});

      expect(emitted.filter(([event]) => event === 'updateProgress')).toHaveLength(0);
    });
  });

  it('tears the sandbox down on unmount', async () => {
    const { api, utils, sandbox } = renderSandbox();
    await api.initializeSandbox();
    const instance = sandbox();

    utils.unmount();

    expect(instance.destroy).toHaveBeenCalled();
  });
});
