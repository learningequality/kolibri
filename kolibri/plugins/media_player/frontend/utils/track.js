export const MODE_SHOWING = 'showing';
export const MODE_HIDDEN = 'hidden';
export const MODE_DISABLED = 'disabled';

export default {
  isEnabledMode(mode) {
    return mode === MODE_SHOWING || mode === MODE_HIDDEN;
  },

  setMode(track, enabled, hidden = false) {
    let mode = MODE_DISABLED;

    if (enabled) {
      mode = hidden ? MODE_HIDDEN : MODE_SHOWING;
    }

    if (track.mode !== mode) {
      track.mode = mode;
    }
  },

  isEnabled(track) {
    return this.isEnabledMode(track.mode);
  },

  listToArray(list) {
    return Array.prototype.slice.call(list, 0);
  },
};
