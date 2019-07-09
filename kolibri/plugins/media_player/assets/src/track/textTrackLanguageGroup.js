import EventEmitter from 'events';
import constants from '../constants.json';
import trackUtils from '../utils/track';

// This class will pretend to be of "subtitle" kind
const KIND = constants.KIND_SUBTITLES;
const ENABLED_MODE = constants.KIND_ENABLED_MODE[KIND];
const DISABLED_MODE = constants.KIND_DISABLED_MODE[KIND];

/**
 * Groups different kinds of text tracks by common language. Specifically, in our use case, we're
 * duplicating the same text track as both 'captions' and 'metadata' kinds. The 'caption' kind is
 * for captions displayed as subtitles and the 'metadata' kind is for the transcript. This allows
 * us to use the built-in language selector of video.js without it affecting an actual track.
 */
class TextTrackLanguageGroup extends EventEmitter {
  /**
   * @param {String} language
   * @param {TextTrack[]} tracks
   */
  constructor(language, tracks) {
    super();

    this._mode = DISABLED_MODE;
    this._language = language;
    this._tracks = tracks;
    this._id = null;
    this._disabledKinds = [];

    tracks.forEach(track => {
      if (track.language !== language) {
        throw new Error('Mismatched track language');
      }

      if (trackUtils.isEnabled(track)) {
        this.enableKind(track.kind);
      } else {
        this.disableKind(track.kind);
      }

      track.on('trackchange', () => {
        if (trackUtils.isEnabled(track)) {
          this.enableKind(track.kind);
        }
      });
    });
  }

  /**
   * @return {TextTrackCueList|null}
   */
  get activeCues() {
    const activeTrack = this.findEnabled();
    return activeTrack ? activeTrack.activeCues : null;
  }

  /**
   * Return cues from the first track that has cues
   *
   * @return {TextTrackCueList}
   */
  get cues() {
    return this._tracks
      .map(track => track.cues)
      .filter(cues => cues && cues.length)
      .shift();
  }

  /**
   * @return {String}
   */
  get id() {
    return this._id || this._tracks[0].id;
  }

  /**
   * @param {String} id
   */
  set id(id) {
    this._id = id;
  }

  /**
   * @return {String}
   */
  get kind() {
    // We'll simply return one kind
    return KIND;
  }

  /**
   * @return {String}
   */
  get label() {
    return this._tracks[0].label;
  }

  /**
   * @return {String}
   */
  get language() {
    return this._language;
  }

  /**
   * @return {String}
   */
  get mode() {
    return this._mode;
  }

  /**
   * @param {String} mode
   */
  set mode(mode) {
    const enabling = trackUtils.isEnabledMode(mode);

    this._mode = enabling ? ENABLED_MODE : DISABLED_MODE;

    this._tracks.forEach(track => {
      if (this._disabledKinds.find(disabledKind => track.kind === disabledKind)) {
        return;
      }

      // Get the enabled/disabled mode for each track based on its kind
      const newMode = enabling
        ? trackUtils.getEnabledMode(track)
        : trackUtils.getDisabledMode(track);

      if (track.mode !== newMode) {
        track.mode = newMode;
        this.emit(enabling ? 'enable' : 'disable');
      }
    });
  }

  /**
   * @param {TextTrackCue} cue
   */
  addCue(cue) {
    this._tracks.forEach(track => {
      track.addCue(cue);
    });
  }

  enable() {
    this.mode = ENABLED_MODE;
  }

  disable() {
    this.mode = DISABLED_MODE;
  }

  enableKind(kind) {
    this._disabledKinds = this._disabledKinds.filter(disabledKind => disabledKind !== kind);

    if (this.isEnabled()) {
      this._tracks.filter(track => track.kind === kind).forEach(track => {
        track.mode = trackUtils.getEnabledMode(track);
      });
    }

    this.emit('enableKind', kind);
  }

  disableKind(kind) {
    this._disabledKinds.push(kind);

    this._tracks.filter(track => track.kind === kind).forEach(track => {
      track.mode = trackUtils.getDisabledMode(track);
    });

    this.emit('disableKind', kind);
  }

  /**
   * @return {boolean}
   */
  isEnabled() {
    return this._mode === ENABLED_MODE;
  }

  /**
   * @return {TextTrack|null}
   */
  findEnabled() {
    return this._tracks.find(track => trackUtils.isEnabled(track));
  }
}

export default TextTrackLanguageGroup;
