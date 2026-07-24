import { render, screen, fireEvent } from '@testing-library/vue';
import { ref, nextTick } from 'vue';

// Fake video.js (the hard boundary) so the REAL useMediaPlayer / useCaptions /
// useMediaProgress run. useContentViewer is the content-data boundary.
jest.mock('video.js', () => require('../../test/videojsMock').videojsModuleMock());
jest.mock('kolibri/composables/useContentViewer');

/* eslint-disable import-x/first, import-x/named */
import videojs from 'video.js';
import useContentViewer, { useContentViewerMock } from 'kolibri/composables/useContentViewer';
import AudioPlayer from '../AudioPlayer';
import mediaStrings from '../../utils/mediaStrings';
import { createTrack, flushPlayerReady } from '../../test/videojsMock';
/* eslint-enable import-x/first, import-x/named */

const { progressBar$, showTranscript$, hideTranscript$ } = mediaStrings;

const AUDIO_FILES = [
  { storage_url: '/audio.mp3', preset: 'audio', extension: 'mp3', available: true },
  { storage_url: '/audio.ogg', preset: 'audio', extension: 'ogg', available: true },
];

const mockWindowIsSmall = ref(false);
jest.mock('kolibri-design-system/lib/composables/useKResponsiveWindow', () => () => ({
  windowIsSmall: mockWindowIsSmall,
}));

function mockContent(overrides = {}) {
  useContentViewer.mockImplementation(() =>
    useContentViewerMock({ files: AUDIO_FILES, defaultFile: AUDIO_FILES[0], ...overrides }),
  );
}

async function renderReady(overrides) {
  if (overrides) {
    mockContent(overrides);
  }
  const utils = render(AudioPlayer);
  await flushPlayerReady();
  return utils;
}

// Access the fake player created during init and bind a text-track list to it.
function bindTracks(tracks) {
  const player = videojs.mock.results.at(-1).value;
  player._setTextTracks(tracks);
  player.trigger('loadstart');
  return player;
}

describe('AudioPlayer', () => {
  let intersectionCallback;
  const mockObserve = jest.fn();
  const mockDisconnect = jest.fn();

  beforeAll(() => {
    global.IntersectionObserver = jest.fn(callback => {
      intersectionCallback = callback;
      return { observe: mockObserve, disconnect: mockDisconnect };
    });
  });

  beforeEach(() => {
    window.localStorage.clear();
    videojs.mockClear();
    mockObserve.mockClear();
    mockDisconnect.mockClear();
    mockWindowIsSmall.value = false;
    mockContent();
  });

  describe('loading state', () => {
    it('shows the loader until the player is ready', () => {
      // With no source file the player never initializes, so loading stays true.
      mockContent({ defaultFile: null });
      render(AudioPlayer);
      expect(screen.getByRole('progressbar')).toBeVisible();
    });

    it('hides the controls while loading', () => {
      mockContent({ defaultFile: null });
      render(AudioPlayer);
      expect(screen.queryByRole('slider', { name: progressBar$() })).not.toBeInTheDocument();
    });

    it('shows the controls once the player is ready', async () => {
      await renderReady();
      screen.getByRole('slider', { name: progressBar$() });
    });
  });

  describe('audio sources', () => {
    it('renders a source element per audio file', () => {
      const { container } = render(AudioPlayer);
      expect(container.querySelectorAll('audio source')).toHaveLength(2);
    });

    it('sets the MIME type on each source', () => {
      const { container } = render(AudioPlayer);
      const sources = container.querySelectorAll('audio source');
      expect(sources[0]).toHaveAttribute('type', 'audio/mpeg');
      expect(sources[1]).toHaveAttribute('type', 'audio/ogg');
    });
  });

  describe('poster image', () => {
    it('shows the poster once loaded when a thumbnail exists', async () => {
      await renderReady({ thumbnailFiles: [{ storage_url: '/poster.jpg' }] });
      expect(screen.getByRole('img')).toHaveAttribute('src', '/poster.jpg');
    });

    it('renders no poster when there are no thumbnails', async () => {
      await renderReady();
      expect(screen.queryByRole('img')).not.toBeInTheDocument();
    });
  });

  describe('transcript', () => {
    it('shows the transcript toggle when the media has caption tracks', async () => {
      await renderReady();
      bindTracks([createTrack({ language: 'en' })]);
      await nextTick();
      screen.getByRole('button', { name: showTranscript$() });
    });

    it('hides the transcript toggle when there are no caption tracks', async () => {
      await renderReady();
      expect(screen.queryByRole('button', { name: showTranscript$() })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: hideTranscript$() })).not.toBeInTheDocument();
    });

    it('flips the toggle label when clicked', async () => {
      await renderReady();
      bindTracks([createTrack({ language: 'en' })]);
      await nextTick();

      await fireEvent.click(screen.getByRole('button', { name: showTranscript$() }));

      screen.getByRole('button', { name: hideTranscript$() });
    });
  });

  describe('sticky player', () => {
    it('does not show the sticky player when paused', async () => {
      const { container } = await renderReady();
      videojs.mock.results.at(-1).value.trigger('pause');
      intersectionCallback([{ isIntersecting: false }]);
      await nextTick();
      expect(container.querySelector('.sticky-top, .sticky-bottom')).toBeNull();
    });

    it('shows the sticky player when playing and scrolled out of view', async () => {
      const { container } = await renderReady();
      const player = videojs.mock.results.at(-1).value;
      player.trigger('play');
      intersectionCallback([{ isIntersecting: false }]);
      await nextTick();
      expect(container.querySelector('.sticky-top, .sticky-bottom')).toBeTruthy();
    });

    it('hides the sticky player again when scrolled back into view', async () => {
      const { container } = await renderReady();
      const player = videojs.mock.results.at(-1).value;
      player.trigger('play');

      intersectionCallback([{ isIntersecting: false }]);
      await nextTick();
      expect(container.querySelector('.sticky-top, .sticky-bottom')).toBeTruthy();

      intersectionCallback([{ isIntersecting: true }]);
      await nextTick();
      expect(container.querySelector('.sticky-top, .sticky-bottom')).toBeNull();
    });
  });

  describe('player initialization', () => {
    it('initializes a video.js player on mount', async () => {
      await renderReady();
      expect(videojs).toHaveBeenCalledTimes(1);
    });

    it('observes the root element for intersection once ready', async () => {
      await renderReady();
      expect(mockObserve).toHaveBeenCalled();
    });
  });

  describe('source change', () => {
    // The element only takes a new player once the old one lets go of it, so
    // re-init has to dispose before it constructs.
    async function renderThenSwapSource() {
      const content = useContentViewerMock({ files: AUDIO_FILES, defaultFile: AUDIO_FILES[0] });
      useContentViewer.mockImplementation(() => content);
      const utils = await renderReady();
      const first = videojs.mock.results.at(-1).value;

      content.defaultFile.value = { storage_url: '/other.mp3', preset: 'audio', extension: 'mp3' };
      await flushPlayerReady();
      return { first, ...utils };
    }

    it('disposes the previous player before constructing the new one', async () => {
      const { first } = await renderThenSwapSource();

      expect(videojs).toHaveBeenCalledTimes(2);
      expect(first.dispose).toHaveBeenCalled();
      expect(first.dispose.mock.invocationCallOrder[0]).toBeLessThan(
        videojs.mock.invocationCallOrder[1],
      );
    });

    it('leaves the new player attached to the document', async () => {
      const { container } = await renderThenSwapSource();

      const audio = videojs.mock.calls[1][0];
      expect(container.contains(audio)).toBe(true);
    });

    it('re-observes intersection without leaking the previous observer', async () => {
      await renderThenSwapSource();

      expect(mockObserve).toHaveBeenCalledTimes(2);
      expect(mockDisconnect).toHaveBeenCalledTimes(1);
    });
  });

  describe('standalone vs embedded', () => {
    it('applies the standalone wrapper when not embedded', () => {
      const { container } = render(AudioPlayer);
      expect(container.querySelector('.standalone-wrapper')).toBeTruthy();
    });

    it('drops the standalone wrapper when embedded', () => {
      mockContent({ embedded: true });
      const { container } = render(AudioPlayer);
      expect(container.querySelector('.standalone-wrapper')).toBeNull();
    });
  });
});
