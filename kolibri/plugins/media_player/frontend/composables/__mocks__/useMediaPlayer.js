/**
 * `useMediaPlayer` composable function mock.
 *
 * If default values are sufficient for tests,
 * you only need call `jest.mock('<useMediaPlayer file path>')`
 * at the top of a test file.
 *
 * To control mock state per-test, import the mock refs and functions:
 *
 * ```
 * // eslint-disable-next-line import-x/named
 * import { mockCurrentTime, mockIsPlaying, resetMocks } from '<useMediaPlayer file path>';
 *
 * jest.mock('<useMediaPlayer file path>');
 *
 * beforeEach(() => resetMocks());
 *
 * it('test', () => {
 *   mockIsPlaying.value = true;
 *   render(MyComponent);
 *   // ...
 * });
 * ```
 */
import { ref } from 'vue';

export const PLAYBACK_RATES = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];

// Mock functions (actions)
export const mockInitPlayer = jest.fn();
export const mockTogglePlay = jest.fn();
export const mockSeek = jest.fn();
export const mockRewind = jest.fn();
export const mockForward = jest.fn();
export const mockToggleMute = jest.fn();
export const mockSetPlaybackRate = jest.fn();
export const mockSetLanguage = jest.fn();
export const mockToggleSubtitles = jest.fn();
export const mockToggleTranscript = jest.fn();

// Mock reactive state (shared across default export and injectMediaPlayer)
export const mockCurrentTime = ref(0);
export const mockDuration = ref(120);
export const mockIsPlaying = ref(false);
export const mockMuted = ref(false);
export const mockPlaybackRate = ref(1.0);
export const mockVolume = ref(1.0);
export const mockPlayer = ref(null);
export const mockLanguage = ref('en');
export const mockSubtitles = ref(true);
export const mockTranscript = ref(false);
export const mockCues = ref([]);
export const mockActiveCueIds = ref([]);
export const mockContainerRect = ref({
  top: 0,
  left: 0,
  width: 800,
  height: 600,
  bottom: 600,
  right: 800,
});

// Default export state (AudioPlayer setup)
export const mockDefaultFile = ref({ storage_url: '/audio.mp3', extension: 'mp3' });
export const mockFiles = ref([
  { storage_url: '/audio.mp3', preset: 'audio', extension: 'mp3' },
  { storage_url: '/audio.ogg', preset: 'audio', extension: 'ogg' },
]);
export const mockThumbnailFiles = ref([]);
export const mockEmbedded = ref(false);
export const mockCaptionTracks = ref([]);
export const mockTrackSources = ref([]);
export const mockLoading = ref(false);

export const injectMediaPlayer = jest.fn(() => ({
  player: mockPlayer,
  currentTime: mockCurrentTime,
  duration: mockDuration,
  isPlaying: mockIsPlaying,
  volume: mockVolume,
  muted: mockMuted,
  playbackRate: mockPlaybackRate,
  language: mockLanguage,
  subtitles: mockSubtitles,
  transcript: mockTranscript,
  cues: mockCues,
  activeCueIds: mockActiveCueIds,
  togglePlay: mockTogglePlay,
  seek: mockSeek,
  rewind: mockRewind,
  forward: mockForward,
  toggleMute: mockToggleMute,
  setPlaybackRate: mockSetPlaybackRate,
  setLanguage: mockSetLanguage,
  toggleSubtitles: mockToggleSubtitles,
  toggleTranscript: mockToggleTranscript,
  containerRect: mockContainerRect,
}));

export default jest.fn((_context, options) => {
  if (options && options.onReady) {
    options.onReady();
  }
  return {
    defaultFile: mockDefaultFile,
    files: mockFiles,
    thumbnailFiles: mockThumbnailFiles,
    embedded: mockEmbedded,
    initPlayer: mockInitPlayer,
    captionTracks: mockCaptionTracks,
    transcript: mockTranscript,
    toggleTranscript: mockToggleTranscript,
    trackSources: mockTrackSources,
    isDefaultTrack: jest.fn(() => false),
    loading: mockLoading,
    isPlaying: mockIsPlaying,
  };
});

const allMockFns = [
  mockInitPlayer,
  mockTogglePlay,
  mockSeek,
  mockRewind,
  mockForward,
  mockToggleMute,
  mockSetPlaybackRate,
  mockSetLanguage,
  mockToggleSubtitles,
  mockToggleTranscript,
];

/**
 * Reset all mock state to defaults. Call in beforeEach.
 */
export function resetMocks() {
  mockCurrentTime.value = 0;
  mockDuration.value = 120;
  mockIsPlaying.value = false;
  mockMuted.value = false;
  mockPlaybackRate.value = 1.0;
  mockVolume.value = 1.0;
  mockPlayer.value = null;
  mockLanguage.value = 'en';
  mockSubtitles.value = true;
  mockTranscript.value = false;
  mockCues.value = [];
  mockActiveCueIds.value = [];
  mockContainerRect.value = {
    top: 0,
    left: 0,
    width: 800,
    height: 600,
    bottom: 600,
    right: 800,
  };
  mockDefaultFile.value = { storage_url: '/audio.mp3', extension: 'mp3' };
  mockFiles.value = [
    { storage_url: '/audio.mp3', preset: 'audio', extension: 'mp3' },
    { storage_url: '/audio.ogg', preset: 'audio', extension: 'ogg' },
  ];
  mockThumbnailFiles.value = [];
  mockEmbedded.value = false;
  mockCaptionTracks.value = [];
  mockTrackSources.value = [];
  mockLoading.value = false;

  for (const fn of allMockFns) {
    fn.mockClear();
  }
}
