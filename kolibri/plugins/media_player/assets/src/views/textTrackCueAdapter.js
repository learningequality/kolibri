import EventEmitter from 'events';

/**
 * Wraps `TextTrackCue` for special handling
 */
class TextTrackCueAdapter extends EventEmitter {
  /**
   * @param {TextTrackCue} cue
   * @param {TextTrack} track
   */
  constructor(cue, track) {
    super();

    this._cue = cue;
    this._track = track;
    this._id = null;

    ['enter', 'exit'].forEach(event => {
      cue.on(event, () => this.emit(event));
    });
  }

  /**
   * @return {TextTrack}
   */
  get track() {
    return this._track;
  }

  /**
   * @return {String}
   */
  get id() {
    return this._id || this._cue.id;
  }

  /**
   * @param {String} id
   */
  set id(id) {
    this._id = id;
  }

  /**
   * @return {Number}
   */
  get startTime() {
    return this._cue.startTime;
  }

  /**
   * @return {Number}
   */
  get endTime() {
    return this._cue.endTime;
  }
}

export default TextTrackCueAdapter;
