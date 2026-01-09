import { render, screen, fireEvent } from '@testing-library/vue';
import videojs from 'video.js';
import AudioPlayerControls from '../AudioPlayerControls';
import mediaStrings from '../../utils/mediaStrings';
/* eslint-disable import-x/named */
import {
  mockCurrentTime,
  mockDuration,
  mockIsPlaying,
  mockMuted,
  mockPlaybackRate,
  mockTogglePlay,
  mockSeek,
  mockRewind,
  mockForward,
  mockToggleMute,
  mockSetPlaybackRate,
  resetMocks,
} from '../../composables/useMediaPlayer';
/* eslint-enable import-x/named */

jest.mock('../../composables/useMediaPlayer');

jest.mock('video.js', () => ({
  formatTime: seconds => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  },
}));

const { play$, pause$, replay$, forward$, mute$, unmute$, playbackRate$, progressBar$ } =
  mediaStrings;

describe('AudioPlayerControls', () => {
  beforeEach(() => {
    resetMocks();
    mockCurrentTime.value = 30;
  });

  describe('transport controls', () => {
    it('renders play button when paused', () => {
      render(AudioPlayerControls);
      expect(screen.getByLabelText(play$())).toBeInTheDocument();
    });

    it('renders pause button when playing', () => {
      mockIsPlaying.value = true;
      render(AudioPlayerControls);
      expect(screen.getByLabelText(pause$())).toBeInTheDocument();
    });

    it('calls togglePlay when play button is clicked', async () => {
      render(AudioPlayerControls);
      await fireEvent.click(screen.getByLabelText(play$()));
      expect(mockTogglePlay).toHaveBeenCalledTimes(1);
    });

    it('renders rewind and forward buttons', () => {
      render(AudioPlayerControls);
      expect(screen.getByLabelText(replay$())).toBeInTheDocument();
      expect(screen.getByLabelText(forward$())).toBeInTheDocument();
    });

    it('calls rewind when rewind button is clicked', async () => {
      render(AudioPlayerControls);
      await fireEvent.click(screen.getByLabelText(replay$()));
      expect(mockRewind).toHaveBeenCalledTimes(1);
    });

    it('calls forward when forward button is clicked', async () => {
      render(AudioPlayerControls);
      await fireEvent.click(screen.getByLabelText(forward$()));
      expect(mockForward).toHaveBeenCalledTimes(1);
    });
  });

  describe('progress display', () => {
    it('displays formatted current time', () => {
      render(AudioPlayerControls);
      expect(screen.getByText(videojs.formatTime(mockCurrentTime.value))).toBeInTheDocument();
    });

    it('displays formatted duration', () => {
      render(AudioPlayerControls);
      expect(screen.getByText(videojs.formatTime(mockDuration.value))).toBeInTheDocument();
    });

    it('renders a progress slider with correct ARIA attributes', () => {
      render(AudioPlayerControls);
      const slider = screen.getByRole('slider', { name: progressBar$() });
      expect(slider).toBeInTheDocument();
      expect(slider).toHaveAttribute('aria-valuemin', '0');
      expect(slider).toHaveAttribute('aria-valuemax', String(mockDuration.value));
      expect(slider).toHaveAttribute('aria-valuenow', String(mockCurrentTime.value));
    });
  });

  describe('secondary controls', () => {
    it('renders mute button when not muted', () => {
      render(AudioPlayerControls);
      expect(screen.getByLabelText(mute$())).toBeInTheDocument();
    });

    it('renders unmute button when muted', () => {
      mockMuted.value = true;
      render(AudioPlayerControls);
      expect(screen.getByLabelText(unmute$())).toBeInTheDocument();
    });

    it('calls toggleMute when mute button is clicked', async () => {
      render(AudioPlayerControls);
      await fireEvent.click(screen.getByLabelText(mute$()));
      expect(mockToggleMute).toHaveBeenCalledTimes(1);
    });

    it('displays playback rate label', () => {
      render(AudioPlayerControls);
      const rateLabel = `${mockPlaybackRate.value}X`;
      expect(screen.getByText(rateLabel)).toBeInTheDocument();
    });

    it('cycles playback rate when rate button is clicked', async () => {
      render(AudioPlayerControls);
      await fireEvent.click(screen.getByLabelText(playbackRate$()));
      expect(mockSetPlaybackRate).toHaveBeenCalledWith(1.25);
    });

    it('wraps back to 0.5X after 2X', async () => {
      mockPlaybackRate.value = 2.0;
      render(AudioPlayerControls);
      await fireEvent.click(screen.getByLabelText(playbackRate$()));
      expect(mockSetPlaybackRate).toHaveBeenCalledWith(0.5);
    });
  });

  describe('keyboard navigation', () => {
    it('seeks forward on ArrowRight key', async () => {
      render(AudioPlayerControls);
      const slider = screen.getByRole('slider', { name: progressBar$() });
      await fireEvent.keyDown(slider, { key: 'ArrowRight' });
      expect(mockForward).toHaveBeenCalledWith(5);
    });

    it('seeks backward on ArrowLeft key', async () => {
      render(AudioPlayerControls);
      const slider = screen.getByRole('slider', { name: progressBar$() });
      await fireEvent.keyDown(slider, { key: 'ArrowLeft' });
      expect(mockRewind).toHaveBeenCalledWith(5);
    });

    it('seeks to start on Home key', async () => {
      render(AudioPlayerControls);
      const slider = screen.getByRole('slider', { name: progressBar$() });
      await fireEvent.keyDown(slider, { key: 'Home' });
      expect(mockSeek).toHaveBeenCalledWith(0);
    });

    it('seeks to end on End key', async () => {
      render(AudioPlayerControls);
      const slider = screen.getByRole('slider', { name: progressBar$() });
      await fireEvent.keyDown(slider, { key: 'End' });
      expect(mockSeek).toHaveBeenCalledWith(mockDuration.value);
    });
  });
});
