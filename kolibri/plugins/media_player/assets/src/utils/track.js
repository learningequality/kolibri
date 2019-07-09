import constants from '../constants.json';

export default {
  /**
   * @param {String} mode
   * @return {boolean}
   */
  isEnabledMode(mode) {
    return Object.values(constants.KIND_ENABLED_MODE).indexOf(mode) >= 0;
  },

  /**
   * @param {TextTrack} track
   * @return {String}
   */
  getEnabledMode(track) {
    if (!(track.kind in constants.KIND_ENABLED_MODE)) {
      throw new Error('Unknown track kind');
    }

    return constants.KIND_ENABLED_MODE[track.kind];
  },

  /**
   * @param {TextTrack} track
   * @return {String}
   */
  getDisabledMode(track) {
    if (!(track.kind in constants.KIND_DISABLED_MODE)) {
      throw new Error('Unknown track kind');
    }

    return constants.KIND_DISABLED_MODE[track.kind];
  },

  /**
   * @param {TextTrack} track
   * @return {boolean}
   */
  isEnabled(track) {
    return track.mode === this.getEnabledMode(track);
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
