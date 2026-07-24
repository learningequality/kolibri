/**
 * Render a media player descendant inside a REAL useMediaPlayer provider.
 *
 * Child components (AudioPlayerControls, AudioStickyPlayer, the transcript and
 * menu items) reach the player through injectMediaPlayer. Rather than faking
 * that provide — a second, hand-maintained copy of the context shape — they are
 * mounted under a minimal host that calls useMediaPlayer against the video.js
 * fake, so assertions land on the player itself.
 *
 * The spec must mock both boundaries (jest.mock is hoisted per file):
 *
 *   jest.mock('video.js', () => require('../../test/videojsMock').videojsModuleMock());
 *   jest.mock('kolibri/composables/useContentViewer');
 *
 *   const { player } = await renderWithMediaPlayer(AudioPlayerControls);
 *   setPlayerState(player, { currentTime: 30, duration: 120 });
 *   await nextTick();
 */
import { render } from '@testing-library/vue';
import { ref, nextTick } from 'vue';
import videojs from 'video.js';
// eslint-disable-next-line import-x/named
import useContentViewer, { useContentViewerMock } from 'kolibri/composables/useContentViewer';
import useMediaPlayer from '../composables/useMediaPlayer';
import { flushPlayerReady } from './videojsMock';

const AUDIO_FILES = [
  { storage_url: '/audio.mp3', preset: 'audio', extension: 'mp3', available: true },
  { storage_url: '/audio.ogg', preset: 'audio', extension: 'ogg', available: true },
];

/**
 * Build the host component: the media element and lifecycle useMediaPlayer needs,
 * with the component under test as a descendant.
 * @param {object} Component - Component under test
 * @param {object} props - Props for the component under test
 * @returns {object} A Vue component definition
 */
function createHost(Component, props) {
  return {
    name: 'MediaPlayerHost',
    setup(_, context) {
      const rootEl = ref(null);
      const wrapper = ref(null);
      const playerRef = ref(null);
      useMediaPlayer(context, {
        rootEl,
        wrapperRef: wrapper,
        playerRef,
        getPlayerConfig: () => ({}),
      });
      return { rootEl, wrapper, playerRef };
    },
    render(h) {
      return h('div', { ref: 'rootEl' }, [
        h('div', { ref: 'wrapper' }, [h('audio', { ref: 'playerRef' }), h(Component, { props })]),
      ]);
    },
  };
}

/**
 * Render a component under a real media player context and return the fake
 * video.js player driving it.
 * @param {object} Component - Component under test
 * @param {object} [options] - Host options
 * @param {object} [options.props] - Props passed to the component under test
 * @param {object} [options.content] - useContentViewer overrides (files, embedded, ...)
 * @returns {Promise<object>} Testing Library utils plus the fake `player`
 */
export async function renderWithMediaPlayer(Component, { props, content } = {}) {
  useContentViewer.mockImplementation(() =>
    useContentViewerMock({ files: AUDIO_FILES, defaultFile: AUDIO_FILES[0], ...content }),
  );

  const utils = render(createHost(Component, props));
  await flushPlayerReady();

  const player = videojs.mock.results.at(-1).value;
  // handleReadyPlayer autoplays. Settle on a known paused baseline and drop the
  // ready-time calls so specs assert only the interactions they trigger.
  player.pause();
  player.play.mockClear();
  player.pause.mockClear();
  await nextTick();

  return { ...utils, player };
}
