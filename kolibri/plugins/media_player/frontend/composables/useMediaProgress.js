/**
 * Composable for tracking media playback progress and content state.
 *
 * Manages the time-based progress calculation, seeking behavior,
 * play/pause state transitions, and content state persistence.
 * @typedef {object} ProgressTrackingApi
 * @param {object} options - Tracking configuration
 * @param {import('vue').Ref} options.player - Ref to the video.js player instance
 * @param {Function} options.emit - Component emit function
 * @param {import('vue').Ref} options.forceDurationBasedProgress
 * Whether to use duration-based tracking
 * @param {import('vue').Ref} options.durationBasedProgress
 * Duration-based progress value (0-1)
 * @param {import('vue').Ref} options.extraFields
 * Extra fields from content viewer (contains contentState)
 * @param {import('vue').ComputedRef} options.savedLocation
 * Saved playback position from content state
 * @property {() => void} recordProgress Record current playback progress since last
 * checkpoint.
 * @property {() => void} updateContentState Persist current playback position to
 * content state.
 * @property {() => void} updateTime Handle time update events (records progress every
 * 5 seconds).
 * @property {() => void} handleSeek Handle seek events, recording pre-seek progress.
 * @property {(state: boolean) => void} setPlayState Handle play/pause transitions with
 * progress recording.
 * @returns {ProgressTrackingApi}
 */
export default function useProgressTracking({
  player,
  emit,
  forceDurationBasedProgress,
  durationBasedProgress,
  extraFields,
  savedLocation,
}) {
  // Internal tracking state — plain locals, never exposed reactively.
  let dummyTime = 0;
  let progressStartingPoint = 0;
  let lastUpdateTime = 0;

  function recordProgress() {
    if (forceDurationBasedProgress.value) {
      emit('updateProgress', durationBasedProgress.value);
    } else {
      emit(
        'addProgress',
        Math.max(0, (dummyTime - progressStartingPoint) / Math.floor(player.value.duration())),
      );
    }
    progressStartingPoint = dummyTime;
  }

  function updateContentState() {
    if (!player.value) {
      return;
    }
    const currentLocation = player.value.currentTime();
    let contentState;
    if (extraFields.value) {
      contentState = {
        ...extraFields.value.contentState,
        savedLocation: currentLocation || savedLocation.value,
      };
    } else {
      contentState = { savedLocation: currentLocation || savedLocation.value };
    }
    emit('updateContentState', contentState);
  }

  function updateTime() {
    // Skip out of here if we're currently seeking,
    // so we don't update dummyTime before calculating old progress
    if (player.value.seeking()) {
      return;
    }
    dummyTime = player.value.currentTime();
    if (dummyTime - lastUpdateTime >= 5) {
      recordProgress();
      lastUpdateTime = dummyTime;
    }
  }

  function handleSeek() {
    // Record progress before updating the times,
    // to capture any progress that happened pre-seeking
    recordProgress();

    // Now, update all the timestamps to set the new time location
    // as the baseline starting point
    dummyTime = player.value.currentTime();
    lastUpdateTime = dummyTime;
    progressStartingPoint = dummyTime;
  }

  function setPlayState(state) {
    // Avoid recording progress if we're currently seeking,
    // as timers are in an intermediate state
    if (!player.value.seeking()) {
      recordProgress();
    }
    if (state === true) {
      emit('startTracking');
    } else {
      emit('stopTracking');
    }
  }

  return {
    updateContentState,
    updateTime,
    handleSeek,
    setPlayState,
  };
}
