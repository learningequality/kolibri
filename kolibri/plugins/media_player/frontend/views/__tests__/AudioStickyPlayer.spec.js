import { render, screen, fireEvent } from '@testing-library/vue';
import { ref } from 'vue';
import videojs from 'video.js';
import AudioStickyPlayer from '../AudioStickyPlayer';
import mediaStrings from '../../utils/mediaStrings';
/* eslint-disable import-x/named */
import {
  mockCurrentTime,
  mockDuration,
  mockIsPlaying,
  mockTogglePlay,
  mockRewind,
  mockForward,
  mockToggleMute,
  mockSetPlaybackRate,
  resetMocks,
} from '../../composables/useMediaPlayer';
/* eslint-enable import-x/named */

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

const { pause$, replay$, forward$, mute$, playbackRate$, progressBar$ } = mediaStrings;

describe('AudioStickyPlayer', () => {
  beforeEach(() => {
    resetMocks();
    mockCurrentTime.value = 45;
    mockDuration.value = 300;
    mockIsPlaying.value = true;
    mockWindowIsSmall.value = false;
  });

  describe('desktop layout', () => {
    it('renders all transport buttons', () => {
      render(AudioStickyPlayer);
      expect(screen.getByLabelText(pause$())).toBeInTheDocument();
      expect(screen.getByLabelText(replay$())).toBeInTheDocument();
      expect(screen.getByLabelText(forward$())).toBeInTheDocument();
    });

    it('displays current time and duration', () => {
      render(AudioStickyPlayer);
      expect(screen.getByText(videojs.formatTime(mockCurrentTime.value))).toBeInTheDocument();
      expect(screen.getByText(videojs.formatTime(mockDuration.value))).toBeInTheDocument();
    });

    it('renders progress slider with ARIA attributes', () => {
      render(AudioStickyPlayer);
      const slider = screen.getByRole('slider', { name: progressBar$() });
      expect(slider).toBeInTheDocument();
      expect(slider).toHaveAttribute('aria-valuenow', String(mockCurrentTime.value));
      expect(slider).toHaveAttribute('aria-valuemax', String(mockDuration.value));
    });

    it('renders playback rate and volume buttons', () => {
      render(AudioStickyPlayer);
      expect(screen.getByLabelText(playbackRate$())).toBeInTheDocument();
      expect(screen.getByLabelText(mute$())).toBeInTheDocument();
    });

    it('applies sticky-top class on desktop', () => {
      const { container } = render(AudioStickyPlayer);
      expect(container.querySelector('.sticky-top')).toBeTruthy();
      expect(container.querySelector('.sticky-bottom')).toBeNull();
    });
  });

  describe('mobile layout', () => {
    beforeEach(() => {
      mockWindowIsSmall.value = true;
    });

    it('applies sticky-bottom class on mobile', () => {
      const { container } = render(AudioStickyPlayer);
      expect(container.querySelector('.sticky-bottom')).toBeTruthy();
      expect(container.querySelector('.sticky-top')).toBeNull();
    });

    it('renders two-row layout on mobile', () => {
      const { container } = render(AudioStickyPlayer);
      expect(container.querySelector('.rows-2')).toBeTruthy();
      expect(container.querySelector('.rows-1')).toBeNull();
    });

    it('renders all controls in mobile layout', () => {
      render(AudioStickyPlayer);
      expect(screen.getByLabelText(pause$())).toBeInTheDocument();
      expect(screen.getByLabelText(replay$())).toBeInTheDocument();
      expect(screen.getByLabelText(forward$())).toBeInTheDocument();
      expect(screen.getByLabelText(playbackRate$())).toBeInTheDocument();
      expect(screen.getByLabelText(mute$())).toBeInTheDocument();
    });
  });

  describe('interactions', () => {
    it('calls togglePlay when pause button is clicked', async () => {
      render(AudioStickyPlayer);
      await fireEvent.click(screen.getByLabelText(pause$()));
      expect(mockTogglePlay).toHaveBeenCalledTimes(1);
    });

    it('calls rewind when rewind button is clicked', async () => {
      render(AudioStickyPlayer);
      await fireEvent.click(screen.getByLabelText(replay$()));
      expect(mockRewind).toHaveBeenCalledTimes(1);
    });

    it('calls forward when forward button is clicked', async () => {
      render(AudioStickyPlayer);
      await fireEvent.click(screen.getByLabelText(forward$()));
      expect(mockForward).toHaveBeenCalledTimes(1);
    });

    it('cycles playback rate on click', async () => {
      render(AudioStickyPlayer);
      await fireEvent.click(screen.getByLabelText(playbackRate$()));
      expect(mockSetPlaybackRate).toHaveBeenCalledWith(1.25);
    });

    it('calls toggleMute when volume button is clicked', async () => {
      render(AudioStickyPlayer);
      await fireEvent.click(screen.getByLabelText(mute$()));
      expect(mockToggleMute).toHaveBeenCalledTimes(1);
    });
  });

  describe('keyboard navigation on progress bar', () => {
    it('seeks forward on ArrowRight key', async () => {
      render(AudioStickyPlayer);
      const slider = screen.getByRole('slider', { name: progressBar$() });
      await fireEvent.keyDown(slider, { key: 'ArrowRight' });
      expect(mockForward).toHaveBeenCalledWith(5);
    });

    it('seeks backward on ArrowLeft key', async () => {
      render(AudioStickyPlayer);
      const slider = screen.getByRole('slider', { name: progressBar$() });
      await fireEvent.keyDown(slider, { key: 'ArrowLeft' });
      expect(mockRewind).toHaveBeenCalledWith(5);
    });
  });
});
