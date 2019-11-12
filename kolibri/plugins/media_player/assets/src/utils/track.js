export const MODE_SHOWING = 'showing';
export const MODE_HIDDEN = 'hidden';
export const MODE_DISABLED = 'disabled';

export default {
  /**
   * @param {String} mode
   * @return {boolean}
   */
  isEnabledMode(mode) {
    return mode === MODE_SHOWING || mode === MODE_HIDDEN;
  },

  /**
   * Setting mode can cause events, which could cause loop if we don't make sure that the mode
   * isn't already the mode we're going to set
   *
   * @param {TextTrack} track
   * @param {Boolean} enabled
   * @param {Boolean} [hidden]
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
   * @param {TextTrack} track
   * @return {boolean}
   */
  isEnabled(track) {
    return this.isEnabledMode(track.mode);
  },

  /**
   * Text track lists do not implement all array-like features, so this will convert it into an
   * array
   *
   * @param {TextTrackList|TextTrackCueList} list
   * @return {TextTrack[]|TextTrackCue[]}
   */
  listToArray(list) {
    return Array.prototype.slice.call(list, 0);
  },
};
