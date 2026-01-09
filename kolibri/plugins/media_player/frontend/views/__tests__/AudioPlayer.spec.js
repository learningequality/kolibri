import { render, screen, fireEvent } from '@testing-library/vue';
import { nextTick, ref } from 'vue';
import AudioPlayer from '../AudioPlayer';
import mediaStrings from '../../utils/mediaStrings';
/* eslint-disable import-x/named */
import {
  mockThumbnailFiles,
  mockEmbedded,
  mockCaptionTracks,
  mockTranscript,
  mockLoading,
  mockIsPlaying,
  mockInitPlayer,
  mockToggleTranscript,
  resetMocks,
} from '../../composables/useMediaPlayer';
/* eslint-enable import-x/named */

const { play$, showTranscript$, hideTranscript$ } = mediaStrings;

jest.mock('../../composables/useMediaPlayer');

const mockWindowIsSmall = ref(false);
jest.mock('kolibri-design-system/lib/composables/useKResponsiveWindow', () => () => ({
  windowIsSmall: mockWindowIsSmall,
}));

jest.mock('video.js', () => ({
  formatTime: seconds => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  },
}));

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
    resetMocks();
    mockObserve.mockClear();
    mockDisconnect.mockClear();
  });

  describe('loading state', () => {
    it('shows loader when loading', () => {
      mockLoading.value = true;
      render(AudioPlayer);
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('hides controls when loading', () => {
      mockLoading.value = true;
      render(AudioPlayer);
      expect(screen.queryByLabelText(play$())).not.toBeInTheDocument();
    });
  });

  describe('audio sources', () => {
    it('renders source elements for audio files', () => {
      const { container } = render(AudioPlayer);
      const sources = container.querySelectorAll('audio source');
      expect(sources).toHaveLength(2);
    });

    it('sets correct MIME type on source elements', () => {
      const { container } = render(AudioPlayer);
      const sources = container.querySelectorAll('audio source');
      expect(sources[0]).toHaveAttribute('type', 'audio/mpeg');
      expect(sources[1]).toHaveAttribute('type', 'audio/ogg');
    });
  });

  describe('poster image', () => {
    it('shows poster when thumbnail files exist', () => {
      mockThumbnailFiles.value = [{ storage_url: '/poster.jpg' }];
      render(AudioPlayer);
      const poster = screen.getByRole('img');
      expect(poster).toBeInTheDocument();
      expect(poster).toHaveAttribute('src', '/poster.jpg');
    });

    it('does not render poster when no thumbnails', () => {
      render(AudioPlayer);
      expect(screen.queryByRole('img')).not.toBeInTheDocument();
    });
  });

  describe('transcript', () => {
    it('shows transcript toggle button when caption tracks exist', () => {
      mockCaptionTracks.value = [{ id: 'en', lang: 'English' }];
      render(AudioPlayer);
      expect(screen.getByRole('button', { name: showTranscript$() })).toBeInTheDocument();
    });

    it('hides transcript toggle when no caption tracks', () => {
      render(AudioPlayer);
      expect(screen.queryByRole('button', { name: showTranscript$() })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: hideTranscript$() })).not.toBeInTheDocument();
    });

    it('calls toggleTranscript when toggle button is clicked', async () => {
      mockCaptionTracks.value = [{ id: 'en', lang: 'English' }];
      render(AudioPlayer);
      await fireEvent.click(screen.getByRole('button', { name: showTranscript$() }));
      expect(mockToggleTranscript).toHaveBeenCalledTimes(1);
    });

    it('shows "HIDE TRANSCRIPT" button when transcript is enabled', () => {
      mockCaptionTracks.value = [{ id: 'en', lang: 'English' }];
      mockTranscript.value = true;
      render(AudioPlayer);
      expect(screen.getByRole('button', { name: hideTranscript$() })).toBeInTheDocument();
    });
  });

  describe('sticky player', () => {
    it('does not show sticky player when paused', () => {
      const { container } = render(AudioPlayer);
      expect(container.querySelector('.sticky-top, .sticky-bottom')).toBeNull();
    });

    it('shows sticky player when playing and scrolled out of view', async () => {
      mockIsPlaying.value = true;
      const { container } = render(AudioPlayer);
      intersectionCallback([{ isIntersecting: false }]);
      await nextTick();
      expect(
        container.querySelector('.sticky-top') || container.querySelector('.sticky-bottom'),
      ).toBeTruthy();
    });

    it('hides sticky player when scrolled back into view', async () => {
      mockIsPlaying.value = true;
      const { container } = render(AudioPlayer);

      intersectionCallback([{ isIntersecting: false }]);
      await nextTick();
      expect(
        container.querySelector('.sticky-top') || container.querySelector('.sticky-bottom'),
      ).toBeTruthy();

      intersectionCallback([{ isIntersecting: true }]);
      await nextTick();
      expect(container.querySelector('.sticky-top, .sticky-bottom')).toBeNull();
    });
  });

  describe('player initialization', () => {
    it('calls initPlayer on mount', () => {
      render(AudioPlayer);
      expect(mockInitPlayer).toHaveBeenCalledTimes(1);
    });

    it('sets up IntersectionObserver on ready', () => {
      render(AudioPlayer);
      expect(mockObserve).toHaveBeenCalled();
    });
  });

  describe('standalone vs embedded', () => {
    it('applies standalone-wrapper class when not embedded', () => {
      const { container } = render(AudioPlayer);
      expect(container.querySelector('.standalone-wrapper')).toBeTruthy();
    });

    it('does not apply standalone-wrapper when embedded', () => {
      mockEmbedded.value = true;
      const { container } = render(AudioPlayer);
      expect(container.querySelector('.standalone-wrapper')).toBeNull();
    });
  });
});
