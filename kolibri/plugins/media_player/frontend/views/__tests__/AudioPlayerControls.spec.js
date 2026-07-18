import { screen, fireEvent } from '@testing-library/vue';
import { nextTick } from 'vue';

// Fake video.js (the hard boundary) so the REAL useMediaPlayer / useSeekBar run
// and the controls act on an actual player. useContentViewer is the content-data
// boundary, required by the host in renderWithMediaPlayer.
jest.mock('video.js', () => require('../../test/videojsMock').videojsModuleMock());
jest.mock('kolibri/composables/useContentViewer');

/* eslint-disable import-x/first */
import videojs from 'video.js';
import AudioPlayerControls from '../AudioPlayerControls';
import mediaStrings from '../../utils/mediaStrings';
import { setPlayerState } from '../../test/videojsMock';
import { renderWithMediaPlayer } from '../../test/mediaPlayerHost';
/* eslint-enable import-x/first */

const {
  play$,
  pause$,
  replay$,
  forward$,
  mute$,
  unmute$,
  playbackRateWithValue$,
  playbackRateLabel$,
  progressBar$,
} = mediaStrings;

// A 2 minute track, 30 seconds in.
async function renderControls(state) {
  const utils = await renderWithMediaPlayer(AudioPlayerControls);
  setPlayerState(utils.player, { currentTime: 30, duration: 120, ...state });
  await nextTick();
  return utils;
}

describe('AudioPlayerControls', () => {
  beforeEach(() => {
    window.localStorage.clear();
    videojs.mockClear();
  });

  describe('transport controls', () => {
    it('renders play button when paused', async () => {
      await renderControls();
      screen.getByRole('button', { name: play$() });
    });

    it('renders pause button when playing', async () => {
      await renderControls({ paused: false });
      screen.getByRole('button', { name: pause$() });
    });

    it('plays when the play button is clicked', async () => {
      const { player } = await renderControls();
      await fireEvent.click(screen.getByLabelText(play$()));
      expect(player.play).toHaveBeenCalledTimes(1);
      screen.getByRole('button', { name: pause$() });
    });

    it('pauses when the pause button is clicked', async () => {
      const { player } = await renderControls({ paused: false });
      await fireEvent.click(screen.getByLabelText(pause$()));
      expect(player.pause).toHaveBeenCalledTimes(1);
      screen.getByRole('button', { name: play$() });
    });

    it('renders rewind and forward buttons', async () => {
      await renderControls();
      screen.getByRole('button', { name: replay$() });
      screen.getByRole('button', { name: forward$() });
    });

    it('rewinds ten seconds when the rewind button is clicked', async () => {
      const { player } = await renderControls();
      await fireEvent.click(screen.getByLabelText(replay$()));
      expect(player.currentTime()).toBe(20);
    });

    it('forwards ten seconds when the forward button is clicked', async () => {
      const { player } = await renderControls();
      await fireEvent.click(screen.getByLabelText(forward$()));
      expect(player.currentTime()).toBe(40);
    });

    it('does not rewind past the start', async () => {
      const { player } = await renderControls({ currentTime: 4 });
      await fireEvent.click(screen.getByLabelText(replay$()));
      expect(player.currentTime()).toBe(0);
    });

    it('does not forward past the end', async () => {
      const { player } = await renderControls({ currentTime: 115 });
      await fireEvent.click(screen.getByLabelText(forward$()));
      expect(player.currentTime()).toBe(120);
    });
  });

  describe('progress display', () => {
    it('displays formatted current time', async () => {
      const { container } = await renderControls();
      const [current] = container.querySelectorAll('.time-display');
      expect(current).toHaveTextContent('0:30');
    });

    it('displays formatted duration', async () => {
      const { container } = await renderControls();
      const times = container.querySelectorAll('.time-display');
      expect(times[1]).toHaveTextContent('2:00');
    });

    it('renders a progress slider with correct ARIA attributes', async () => {
      await renderControls();
      const slider = screen.getByRole('slider', { name: progressBar$() });
      expect(slider).toHaveAttribute('aria-valuemin', '0');
      expect(slider).toHaveAttribute('aria-valuemax', '120');
      expect(slider).toHaveAttribute('aria-valuenow', '30');
    });

    it('tracks the player as it plays', async () => {
      const { player } = await renderControls();
      setPlayerState(player, { currentTime: 90 });
      await nextTick();
      const slider = screen.getByRole('slider', { name: progressBar$() });
      expect(slider).toHaveAttribute('aria-valuenow', '90');
    });
  });

  describe('secondary controls', () => {
    it('renders mute button when not muted', async () => {
      await renderControls();
      screen.getByRole('button', { name: mute$() });
    });

    it('renders unmute button when muted', async () => {
      await renderControls({ muted: true });
      screen.getByRole('button', { name: unmute$() });
    });

    it('mutes the player when the mute button is clicked', async () => {
      const { player } = await renderControls();
      await fireEvent.click(screen.getByLabelText(mute$()));
      expect(player.muted()).toBe(true);
      screen.getByRole('button', { name: unmute$() });
    });

    it('displays playback rate label', async () => {
      await renderControls();
      const rateLabel = playbackRateLabel$({ rate: 1.0 });
      const name = playbackRateWithValue$({ rate: 1.0 });
      expect(screen.getByRole('button', { name })).toHaveTextContent(rateLabel);
    });

    it('cycles playback rate when the rate button is clicked', async () => {
      const { player } = await renderControls();
      await fireEvent.click(screen.getByLabelText(playbackRateWithValue$({ rate: 1.0 })));
      expect(player.playbackRate()).toBe(1.25);
    });

    it('wraps back to 0.5X after 2X', async () => {
      const { player } = await renderControls({ playbackRate: 2.0 });
      await fireEvent.click(screen.getByLabelText(playbackRateWithValue$({ rate: 2.0 })));
      expect(player.playbackRate()).toBe(0.5);
    });
  });

  describe('pointer seek', () => {
    // duration is 120; a 200px-wide bar maps 1px → 0.6s.
    function mockBarWidth(slider, { left = 0, width = 200 } = {}) {
      slider.getBoundingClientRect = () => ({
        left,
        width,
        right: left + width,
        top: 0,
        bottom: 24,
        height: 24,
        x: left,
        y: 0,
      });
    }

    async function renderWithBar() {
      const utils = await renderControls();
      const slider = screen.getByRole('slider', { name: progressBar$() });
      mockBarWidth(slider);
      return { ...utils, slider };
    }

    it('seeks to the clicked fraction of the duration on mousedown', async () => {
      const { player, slider } = await renderWithBar();
      await fireEvent.mouseDown(slider, { clientX: 100 });
      // 100/200 = 0.5 → 0.5 * 120
      expect(player.currentTime()).toBe(60);
    });

    it('updates the seek position as the pointer is dragged', async () => {
      const { player, slider } = await renderWithBar();
      await fireEvent.mouseDown(slider, { clientX: 0 });
      await fireEvent.mouseMove(document, { clientX: 50 });
      // 50/200 = 0.25 → 0.25 * 120
      expect(player.currentTime()).toBe(30);
    });

    it('clamps the seek position to the bar bounds', async () => {
      const { player, slider } = await renderWithBar();
      await fireEvent.mouseDown(slider, { clientX: 500 });
      expect(player.currentTime()).toBe(120);
    });

    it('stops seeking once the pointer is released', async () => {
      const { player, slider } = await renderWithBar();
      await fireEvent.mouseDown(slider, { clientX: 0 });
      await fireEvent.mouseUp(document);
      await fireEvent.mouseMove(document, { clientX: 100 });
      expect(player.currentTime()).toBe(0);
    });
  });

  describe('keyboard navigation', () => {
    async function pressKey(key) {
      const utils = await renderControls();
      const slider = screen.getByRole('slider', { name: progressBar$() });
      await fireEvent.keyDown(slider, { key });
      return utils;
    }

    it('seeks forward five seconds on ArrowRight', async () => {
      const { player } = await pressKey('ArrowRight');
      expect(player.currentTime()).toBe(35);
    });

    it('seeks backward five seconds on ArrowLeft', async () => {
      const { player } = await pressKey('ArrowLeft');
      expect(player.currentTime()).toBe(25);
    });

    it('seeks to start on Home', async () => {
      const { player } = await pressKey('Home');
      expect(player.currentTime()).toBe(0);
    });

    it('seeks to end on End', async () => {
      const { player } = await pressKey('End');
      expect(player.currentTime()).toBe(120);
    });
  });
});
