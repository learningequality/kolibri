import { render, screen } from '@testing-library/vue';
import { ref, nextTick } from 'vue';

// Fake video.js (the hard boundary) so the REAL useMediaPlayer / useCaptions /
// useMediaProgress run. useContentViewer is the content-data boundary.
jest.mock('video.js', () => require('../../test/videojsMock').videojsModuleMock());
jest.mock('kolibri/composables/useContentViewer');

const mockElementWidth = ref(800);
jest.mock('kolibri-design-system/lib/composables/useKResponsiveElement', () => () => ({
  elementWidth: mockElementWidth,
}));

/* eslint-disable import-x/first, import-x/named */
import videojs from 'video.js';
import useContentViewer, { useContentViewerMock } from 'kolibri/composables/useContentViewer';
import VideoPlayer from '../VideoPlayer';
import mediaStrings from '../../utils/mediaStrings';
import { createTrack, flushPlayerReady } from '../../test/videojsMock';
/* eslint-enable import-x/first, import-x/named */

const VIDEO_FILES = [
  { storage_url: '/video.mp4', preset: 'high_res_video', extension: 'mp4', available: true },
  { storage_url: '/video.webm', preset: 'low_res_video', extension: 'webm', available: true },
];

function mockContent(overrides = {}) {
  useContentViewer.mockImplementation(() =>
    useContentViewerMock({ files: VIDEO_FILES, defaultFile: VIDEO_FILES[0], ...overrides }),
  );
}

async function renderReady(overrides) {
  if (overrides) {
    mockContent(overrides);
  }
  const utils = render(VideoPlayer);
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

describe('VideoPlayer', () => {
  beforeEach(() => {
    window.localStorage.clear();
    videojs.mockClear();
    mockElementWidth.value = 800;
    mockContent();
  });

  describe('video sources', () => {
    it('renders a source element per video file', () => {
      const { container } = render(VideoPlayer);
      expect(container.querySelectorAll('video source')).toHaveLength(2);
    });

    it('sets the MIME type from the file extension', () => {
      const { container } = render(VideoPlayer);
      const sources = container.querySelectorAll('video source');
      expect(sources[0]).toHaveAttribute('type', 'video/mp4');
      expect(sources[1]).toHaveAttribute('type', 'video/webm');
    });

    it('ignores files that are not video presets', () => {
      mockContent({
        files: [...VIDEO_FILES, { storage_url: '/a.mp3', preset: 'audio', extension: 'mp3' }],
      });
      const { container } = render(VideoPlayer);
      expect(container.querySelectorAll('video source')).toHaveLength(2);
    });
  });

  describe('loading state', () => {
    it('shows the loader until the player is ready', () => {
      // With no source file the player never initializes, so loading stays true.
      mockContent({ defaultFile: null });
      render(VideoPlayer);
      expect(screen.getByRole('progressbar')).toBeVisible();
    });

    it('hides the loader once the player is ready', async () => {
      await renderReady();
      // v-show hides it, so it drops out of the accessibility tree
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });
  });

  describe('player initialization', () => {
    it('initializes a video.js player on mount', async () => {
      await renderReady();
      expect(videojs).toHaveBeenCalledTimes(1);
    });

    it('replaces the default big play button with the custom cluster', async () => {
      await renderReady();
      const [, config] = videojs.mock.calls[0];
      expect(config.bigPlayButton).toBe(false);

      const player = videojs.mock.results.at(-1).value;
      const added = player.addChild.mock.calls.map(([name]) => name);
      expect(added).toEqual(['ReplayButton', 'BigPlayToggle', 'ForwardButton']);
    });

    it('builds the control bar with the Kolibri captions and languages buttons', async () => {
      await renderReady();
      const [, config] = videojs.mock.calls[0];
      const children = config.controlBar.children.map(({ name }) => name);
      expect(children).toContain('CaptionsButton');
      expect(children).toContain('LanguagesButton');
      expect(children).toContain('MimicFullscreenToggle');
    });

    it('translates the video.js control strings', async () => {
      await renderReady();
      const [, config] = videojs.mock.calls[0];
      expect(config.languages[config.language].Play).toBe(mediaStrings.play$());
    });

    it('leaves the new player attached to the document after a source change', async () => {
      const content = useContentViewerMock({ files: VIDEO_FILES, defaultFile: VIDEO_FILES[0] });
      useContentViewer.mockImplementation(() => content);
      const { container } = await renderReady();

      content.defaultFile.value = {
        storage_url: '/other.mp4',
        preset: 'high_res_video',
        extension: 'mp4',
      };
      await flushPlayerReady();

      const video = videojs.mock.calls[1][0];
      expect(container.contains(video)).toBe(true);
    });
  });

  describe('player size classes', () => {
    it('adds no size class at full width', async () => {
      await renderReady();
      const player = videojs.mock.results.at(-1).value;
      expect(player.addClass).not.toHaveBeenCalled();
    });

    it('narrows the skin as the element shrinks', async () => {
      await renderReady();
      const player = videojs.mock.results.at(-1).value;

      mockElementWidth.value = 400;
      await nextTick();

      const added = player.addClass.mock.calls.map(([name]) => name);
      expect(added).toEqual(['player-medium', 'player-small']);
    });
  });

  describe('transcript', () => {
    it('stays hidden when the media has no caption tracks', async () => {
      const { container } = await renderReady();
      expect(container.querySelector('.transcript-visible')).toBeNull();
    });

    it('is hidden until the transcript setting is enabled', async () => {
      const { container } = await renderReady();
      bindTracks([createTrack({ language: 'en' })]);
      await nextTick();
      // captionTranscript defaults to false
      expect(container.querySelector('.transcript-visible')).toBeNull();
    });
  });
});
