import { screen, fireEvent } from '@testing-library/vue';
import { ref, nextTick } from 'vue';

// Fake video.js (the hard boundary) so the REAL useMediaPlayer / useSeekBar run
// and the controls act on an actual player. useContentViewer is the content-data
// boundary, required by the host in renderWithMediaPlayer.
jest.mock('video.js', () => require('../../test/videojsMock').videojsModuleMock());
jest.mock('kolibri/composables/useContentViewer');

const mockWindowIsSmall = ref(false);
jest.mock('kolibri-design-system/lib/composables/useKResponsiveWindow', () => () => ({
  windowIsSmall: mockWindowIsSmall,
}));

/* eslint-disable import-x/first */
import videojs from 'video.js';
import AudioStickyPlayer from '../AudioStickyPlayer';
import mediaStrings from '../../utils/mediaStrings';
import { setPlayerState } from '../../test/videojsMock';
import { renderWithMediaPlayer } from '../../test/mediaPlayerHost';
/* eslint-enable import-x/first */

const { pause$, replay$, forward$, mute$, playbackRateWithValue$, progressBar$ } = mediaStrings;
const rateName = (rate = 1.0) => playbackRateWithValue$({ rate });

// A 5 minute track playing, 45 seconds in.
async function renderSticky(state) {
  const utils = await renderWithMediaPlayer(AudioStickyPlayer);
  setPlayerState(utils.player, { currentTime: 45, duration: 300, paused: false, ...state });
  await nextTick();
  return utils;
}

describe('AudioStickyPlayer', () => {
  beforeEach(() => {
    window.localStorage.clear();
    videojs.mockClear();
    mockWindowIsSmall.value = false;
  });

  describe('desktop layout', () => {
    it('renders all transport buttons', async () => {
      await renderSticky();
      screen.getByRole('button', { name: pause$() });
      screen.getByRole('button', { name: replay$() });
      screen.getByRole('button', { name: forward$() });
    });

    it('displays current time and duration', async () => {
      const { container } = await renderSticky();
      const [current, duration] = container.querySelectorAll('.time-display');
      expect(current).toHaveTextContent('0:45');
      expect(duration).toHaveTextContent('5:00');
    });

    it('renders progress slider with ARIA attributes', async () => {
      await renderSticky();
      const slider = screen.getByRole('slider', { name: progressBar$() });
      expect(slider).toHaveAttribute('aria-valuenow', '45');
      expect(slider).toHaveAttribute('aria-valuemax', '300');
    });

    it('renders playback rate and volume buttons', async () => {
      await renderSticky();
      screen.getByRole('button', { name: rateName() });
      screen.getByRole('button', { name: mute$() });
    });

    it('applies sticky-top class on desktop', async () => {
      const { container } = await renderSticky();
      expect(container.querySelector('.sticky-top')).toBeTruthy();
      expect(container.querySelector('.sticky-bottom')).toBeNull();
    });
  });

  describe('mobile layout', () => {
    beforeEach(() => {
      mockWindowIsSmall.value = true;
    });

    it('applies sticky-bottom class on mobile', async () => {
      const { container } = await renderSticky();
      expect(container.querySelector('.sticky-bottom')).toBeTruthy();
      expect(container.querySelector('.sticky-top')).toBeNull();
    });

    it('renders two-row layout on mobile', async () => {
      const { container } = await renderSticky();
      expect(container.querySelector('.rows-2')).toBeTruthy();
      expect(container.querySelector('.rows-1')).toBeNull();
    });

    it('renders all controls in mobile layout', async () => {
      await renderSticky();
      screen.getByRole('button', { name: pause$() });
      screen.getByRole('button', { name: replay$() });
      screen.getByRole('button', { name: forward$() });
      screen.getByRole('button', { name: rateName() });
      screen.getByRole('button', { name: mute$() });
    });
  });

  describe('interactions', () => {
    it('pauses when the pause button is clicked', async () => {
      const { player } = await renderSticky();
      await fireEvent.click(screen.getByLabelText(pause$()));
      expect(player.pause).toHaveBeenCalledTimes(1);
    });

    it('rewinds when the rewind button is clicked', async () => {
      const { player } = await renderSticky();
      await fireEvent.click(screen.getByLabelText(replay$()));
      expect(player.currentTime()).toBe(35);
    });

    it('forwards when the forward button is clicked', async () => {
      const { player } = await renderSticky();
      await fireEvent.click(screen.getByLabelText(forward$()));
      expect(player.currentTime()).toBe(55);
    });

    it('cycles playback rate on click', async () => {
      const { player } = await renderSticky();
      await fireEvent.click(screen.getByLabelText(rateName()));
      expect(player.playbackRate()).toBe(1.25);
    });

    it('mutes when the volume button is clicked', async () => {
      const { player } = await renderSticky();
      await fireEvent.click(screen.getByLabelText(mute$()));
      expect(player.muted()).toBe(true);
    });
  });

  describe('keyboard navigation on progress bar', () => {
    it('seeks forward on ArrowRight key', async () => {
      const { player } = await renderSticky();
      const slider = screen.getByRole('slider', { name: progressBar$() });
      await fireEvent.keyDown(slider, { key: 'ArrowRight' });
      expect(player.currentTime()).toBe(50);
    });

    it('seeks backward on ArrowLeft key', async () => {
      const { player } = await renderSticky();
      const slider = screen.getByRole('slider', { name: progressBar$() });
      await fireEvent.keyDown(slider, { key: 'ArrowLeft' });
      expect(player.currentTime()).toBe(40);
    });
  });
});
