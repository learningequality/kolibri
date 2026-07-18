// Mock kolibri before importing utils that depend on it
import { computed, h, nextTick, ref } from 'vue';
import { render, screen, fireEvent } from '@testing-library/vue';
import kolibri from 'kolibri';
import useContentViewer from 'kolibri/composables/useContentViewer';
import { getRenderableFiles, getDefaultFile, getFilePreset } from '../utils';
import ContentViewer from '../index';

jest.mock('kolibri', () => ({
  default: {
    presetViewerComponent: jest.fn(),
    elementViewerComponent: jest.fn(() => null),
    canHandleElement: jest.fn(() => false),
  },
  __esModule: true,
}));

jest.mock('kolibri/heartbeat', () => ({
  __esModule: true,
  default: { setUserActive: jest.fn() },
}));

// Mock the preset viewer components so they can be used to test the utility functions
const addRegisterableComponents = (...presets) => {
  kolibri.presetViewerComponent.mockImplementation(preset =>
    presets.includes(preset) ? { template: '<div></div>' } : null,
  );
};

describe('Utility Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset mock to return null by default (no viewer registered)
    kolibri.presetViewerComponent.mockReturnValue(null);
  });

  describe('getRenderableFiles', () => {
    it('returns renderable files (files which are available, can be rendered and do not have a thumbnail)', () => {
      const files = [
        { preset: 'preset1', available: true },
        { preset: 'preset2', available: true },
        { preset: 'preset3', available: false },
        { preset: 'preset4', available: true, thumbnail: true },
      ];
      addRegisterableComponents('preset1', 'preset3', 'preset4');

      const renderableFiles = getRenderableFiles(files);
      expect(renderableFiles).toHaveLength(1);
      expect(renderableFiles[0]).toEqual(files[0]);
    });

    it('returns empty array if no renderable file is available', () => {
      const files = [
        { preset: 'preset1', available: false },
        { preset: 'preset2', available: false, thumbnail: true },
        { preset: 'preset3', available: false, supplementary: true },
      ];

      expect(getRenderableFiles(files)).toEqual([]);
    });
  });

  describe('getDefaultFile', () => {
    it('returns first file if files array is not empty', () => {
      const files = [{ name: 'file1' }, { name: 'file2' }];
      expect(getDefaultFile(files)).toEqual({ name: 'file1' });
    });

    it('returns undefined if files array is empty', () => {
      expect(getDefaultFile([])).toBeUndefined();
    });
  });

  describe('getFilePreset', () => {
    it('returns file preset if file exists', () => {
      const file = { preset: 'preset1' };
      expect(getFilePreset(file, 'defaultPreset')).toBe('preset1');
    });

    it('returns default preset if file does not exist but can render content', () => {
      addRegisterableComponents('defaultPreset');
      expect(getFilePreset(null, 'defaultPreset')).toBe('defaultPreset');
    });

    it('returns null if file does not exist and cannot render content', () => {
      expect(getFilePreset(null, 'defaultPreset')).toBeNull();
    });
  });
});

// A renderer that registers a reactive public API through useContentViewer,
// mirroring how QTIViewer/PerseusRenderer expose checkAnswer + hints.
const RegisteringRenderer = {
  name: 'RegisteringRenderer',
  setup(props, context) {
    const { registerAssessmentApi } = useContentViewer(context);
    const hintsVisible = ref(0);
    registerAssessmentApi({
      checkAnswer: () => ({ correct: true, answerState: { response: 'A' } }),
      takeHint: () => {
        hintsVisible.value += 1;
      },
      availableHints: computed(() => 2 - hintsVisible.value),
      totalHints: computed(() => 2),
    });
    return () => h('div', 'renderer');
  },
};

// A renderer that registers nothing — exercises the wrapper's fallbacks.
const SilentRenderer = {
  name: 'SilentRenderer',
  setup(props, context) {
    useContentViewer(context);
    return () => h('div', 'silent');
  },
};

async function mountThroughContentViewer(renderer) {
  kolibri.presetViewerComponent.mockImplementation(preset =>
    preset === 'test-preset' ? renderer : null,
  );
  const Harness = {
    components: { ContentViewer },
    data: () => ({ mounted: false, lastAnswer: 'none' }),
    computed: {
      cv() {
        return this.mounted && this.$refs.cv;
      },
      availableHints() {
        return this.cv ? this.cv.availableHints : -1;
      },
      totalHints() {
        return this.cv ? this.cv.totalHints : -1;
      },
    },
    mounted() {
      this.mounted = true;
    },
    methods: {
      check() {
        this.lastAnswer = JSON.stringify(this.$refs.cv.checkAnswer());
      },
      take() {
        this.$refs.cv.takeHint();
      },
    },
    template: `<div>
      <span data-testid="avail">{{ availableHints }}</span>
      <span data-testid="total">{{ totalHints }}</span>
      <span data-testid="answer">{{ lastAnswer }}</span>
      <button data-testid="check" @click="check">check</button>
      <button data-testid="take" @click="take">take</button>
      <ContentViewer ref="cv" preset="test-preset" />
    </div>`,
  };
  const result = render(Harness);
  // Let the mounted() flag flip and the API-reading computeds settle.
  await nextTick();
  return result;
}

describe('ContentViewer public API registration', () => {
  it('exposes a registered checkAnswer through $refs.contentViewer', async () => {
    await mountThroughContentViewer(RegisteringRenderer);
    await fireEvent.click(screen.getByTestId('check'));
    expect(screen.getByTestId('answer')).toHaveTextContent(
      '{"correct":true,"answerState":{"response":"A"}}',
    );
  });

  it('exposes registered hint counts and updates them reactively on takeHint', async () => {
    await mountThroughContentViewer(RegisteringRenderer);
    expect(screen.getByTestId('total')).toHaveTextContent('2');
    expect(screen.getByTestId('avail')).toHaveTextContent('2');
    await fireEvent.click(screen.getByTestId('take'));
    expect(screen.getByTestId('avail')).toHaveTextContent('1');
  });

  it('falls back to null checkAnswer and zero hints when nothing is registered', async () => {
    await mountThroughContentViewer(SilentRenderer);
    expect(screen.getByTestId('total')).toHaveTextContent('0');
    expect(screen.getByTestId('avail')).toHaveTextContent('0');
    await fireEvent.click(screen.getByTestId('check'));
    expect(screen.getByTestId('answer')).toHaveTextContent('null');
  });
});
