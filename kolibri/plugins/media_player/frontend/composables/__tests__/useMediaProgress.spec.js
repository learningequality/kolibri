import { ref, computed } from 'vue';
import useMediaProgress from '../useMediaProgress';
import { createFakePlayer } from '../../test/videojsMock';

function createMockPlayer({ duration = 100, ...state } = {}) {
  return ref(createFakePlayer({ duration, ...state }));
}

function setup(overrides = {}) {
  const emit = jest.fn();
  const player = overrides.player || createMockPlayer(overrides.playerState);
  const extraFields = overrides.extraFields || ref(null);
  const savedLocation =
    overrides.savedLocation ||
    computed(() => {
      if (extraFields.value && extraFields.value.contentState) {
        return extraFields.value.contentState.savedLocation;
      }
      return 0;
    });

  const result = useMediaProgress({
    player,
    emit,
    forceDurationBasedProgress: overrides.forceDurationBasedProgress || ref(false),
    durationBasedProgress: overrides.durationBasedProgress || ref(0),
    extraFields,
    savedLocation,
  });

  return { emit, player, ...result };
}

describe('useMediaProgress', () => {
  describe('recordProgress', () => {
    it('reports the absolute durationBasedProgress and ignores elapsed time when forced', () => {
      const timeSpent = 30;
      const contentDuration = 300;
      const player = createMockPlayer({ duration: 100, currentTime: 0 });
      const { emit, updateTime } = setup({
        player,
        forceDurationBasedProgress: ref(true),
        durationBasedProgress: ref(timeSpent / contentDuration),
      });

      player.value.currentTime(50);
      updateTime();

      expect(emit).toHaveBeenCalledWith('updateProgress', timeSpent / contentDuration);
      expect(emit).not.toHaveBeenCalledWith('addProgress', expect.anything());
    });

    it('emits addProgress as the fraction of duration newly elapsed since the last record', () => {
      const player = createMockPlayer({ duration: 100, currentTime: 0 });
      const { emit, updateTime } = setup({ player });

      player.value.currentTime(30);
      updateTime();
      player.value.currentTime(50);
      updateTime();

      expect(emit.mock.calls).toEqual([
        ['addProgress', 0.3],
        ['addProgress', 0.2],
      ]);
    });
  });

  describe('updateTime', () => {
    it('updates dummyTime from player currentTime', () => {
      const player = createMockPlayer({ currentTime: 3 });
      const { emit, updateTime } = setup({ player });

      updateTime();

      // 3 seconds elapsed, but less than 5s threshold — no progress emitted
      expect(emit).not.toHaveBeenCalled();
    });

    it('records progress once playback crosses the 5 second threshold', () => {
      const player = createMockPlayer({ duration: 100, currentTime: 6 });
      const { emit, updateTime } = setup({ player });

      updateTime();

      expect(emit).toHaveBeenCalledWith('addProgress', 0.06);
    });

    it('does not re-record until another 5 seconds have elapsed', () => {
      const player = createMockPlayer({ duration: 100, currentTime: 6 });
      const { emit, updateTime } = setup({ player });

      updateTime();
      emit.mockClear();

      player.value.currentTime(9);
      updateTime();
      expect(emit).not.toHaveBeenCalled();

      player.value.currentTime(11);
      updateTime();
      expect(emit).toHaveBeenCalledWith('addProgress', 0.05);
    });

    it('skips update while seeking', () => {
      const player = createMockPlayer({ currentTime: 50, seeking: true });
      const { emit, updateTime } = setup({ player });

      updateTime();

      expect(emit).not.toHaveBeenCalled();
    });
  });

  describe('handleSeek', () => {
    it('flushes sub-threshold progress before a seek and rebaselines after it', () => {
      const player = createMockPlayer({ duration: 100, currentTime: 0 });
      const { emit, updateTime, handleSeek } = setup({ player });

      player.value.currentTime(3);
      updateTime();
      expect(emit).not.toHaveBeenCalled();

      player.value.currentTime(80);
      handleSeek();
      expect(emit).toHaveBeenCalledWith('addProgress', 0.03);

      emit.mockClear();
      player.value.currentTime(85);
      updateTime();
      expect(emit).toHaveBeenCalledWith('addProgress', 0.05);
    });
  });

  describe('setPlayState', () => {
    it('emits startTracking when state is true', () => {
      const player = createMockPlayer();
      const { emit, setPlayState } = setup({ player });

      setPlayState(true);

      expect(emit).toHaveBeenCalledWith('startTracking');
    });

    it('emits stopTracking when state is false', () => {
      const player = createMockPlayer();
      const { emit, setPlayState } = setup({ player });

      setPlayState(false);

      expect(emit).toHaveBeenCalledWith('stopTracking');
    });

    it('records progress before changing state', () => {
      const player = createMockPlayer({ duration: 100 });
      const { emit, setPlayState } = setup({
        player,
        forceDurationBasedProgress: ref(true),
        durationBasedProgress: ref(0.5),
      });

      setPlayState(true);

      // recordProgress should be called before startTracking
      const calls = emit.mock.calls.map(c => c[0]);
      expect(calls.indexOf('updateProgress')).toBeLessThan(calls.indexOf('startTracking'));
    });

    it('skips recording progress while seeking', () => {
      const player = createMockPlayer({ seeking: true });
      const { emit, setPlayState } = setup({ player });

      setPlayState(true);

      // Only startTracking, no progress recording
      expect(emit).toHaveBeenCalledTimes(1);
      expect(emit).toHaveBeenCalledWith('startTracking');
    });
  });

  describe('updateContentState', () => {
    it('emits updateContentState with saved location', () => {
      const player = createMockPlayer({ currentTime: 42 });
      const { emit, updateContentState } = setup({ player });

      updateContentState();

      expect(emit).toHaveBeenCalledWith('updateContentState', { savedLocation: 42 });
    });

    it('preserves existing contentState fields', () => {
      const player = createMockPlayer({ currentTime: 42 });
      const { emit, updateContentState } = setup({
        player,
        extraFields: ref({ contentState: { someField: 'value', savedLocation: 10 } }),
      });

      updateContentState();

      expect(emit).toHaveBeenCalledWith('updateContentState', {
        someField: 'value',
        savedLocation: 42,
      });
    });

    it('does nothing when player is null', () => {
      const { emit, updateContentState } = setup({ player: ref(null) });

      updateContentState();

      expect(emit).not.toHaveBeenCalled();
    });
  });
});
