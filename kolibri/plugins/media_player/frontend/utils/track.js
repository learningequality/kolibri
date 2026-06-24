export const MODE_SHOWING = 'showing';
export const MODE_HIDDEN = 'hidden';
export const MODE_DISABLED = 'disabled';

export default {
  /**
   * Check whether a track mode counts as enabled (showing or hidden).
   * @param {string} mode - The TextTrack mode string to check
   * @returns {boolean} True if the mode is showing or hidden
   */
  isEnabledMode(mode) {
    return mode === MODE_SHOWING || mode === MODE_HIDDEN;
  },

  /**
   * Setting mode can cause events, which could cause loop if we don't make sure that the mode
   * isn't already the mode we're going to set
   * @param {TextTrack} track - The track to update
   * @param {boolean} enabled - Whether the track should be enabled
   * @param {boolean} [hidden] - If enabled, whether to hide the track's cues
   */
  setMode(track, enabled, hidden = false) {
    let mode = MODE_DISABLED;

    if (enabled) {
      mode = hidden ? MODE_HIDDEN : MODE_SHOWING;
    }

    if (track.mode !== mode) {
      track.mode = mode;
    }
  },

  /**
   * Check whether a track is currently enabled.
   * @param {TextTrack} track - The track to check
   * @returns {boolean} True if the track's mode is showing or hidden
   */
  isEnabled(track) {
    return this.isEnabledMode(track.mode);
  },

  /**
   * Text track lists do not implement all array-like features, so this will convert it into an
   * array
   * @param {TextTrackList|TextTrackCueList} list - The list-like object to convert
   * @returns {TextTrack[]|TextTrackCue[]} A plain array of the list's entries
   */
  listToArray(list) {
    return Array.prototype.slice.call(list, 0);
  },
};
