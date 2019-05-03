import EventEmitter from 'events';

// Array.from doesn't work with DOM track list objects
const toArray = thing => Array.prototype.slice.call(thing, 0);

class TrackHandler extends EventEmitter {
  /**
   * @param {TextTrack} track
   */
  constructor(track) {
    super();

    this._track = track;
    this.activate();
    this._cues = this.processCues(track.cues || []);
    this._activeCues = toArray(track.activeCues || []);
    this._cuechange = () => this.handleCueChange();
    this._addcue = cue => this.handleAddCue(cue);

    track.addEventListener('cuechange', this._cuechange);
    track.addEventListener('addcue', this._addcue);
  }

  /**
   * Ensure track mode is `hidden`, which triggers cue events
   */
  activate() {
    this._track.mode = 'hidden';
  }

  /**
   * @param {VTTCue} cue
   */
  handleAddCue(cue) {
    if (this._track.cues && this._track.cues.length !== this._cues.length) {
      this._cues = this.processCues(this._track.cues);
    }

    this._cues.concat(this.processCues([cue]));
    this.emit('addcue');
  }

  handleCueChange() {
    this._activeCues = toArray(this._track.activeCues || []);
    this.emit('cuechange');
  }

  /**
   * @param {TextTrackCueList|VTTCue[]} cues
   * @returns {VTTCue[]}
   */
  processCues(cues) {
    return toArray(cues).map((cue, i) => {
      cue.id = `${this._track.id}-cue-${i}`;
      return cue;
    });
  }

  /**
   * @returns {VTTCue[]}
   */
  getCues() {
    return this._cues;
  }

  /**
   * @returns {string[]}
   */
  getActiveCueIds() {
    return this._activeCues.map(cue => cue.id);
  }

  /**
   * Change mode and remove event listeners
   */
  deactivate() {
    this._track.mode = 'disabled';
    this._track.removeEventListener('cuechange', this._cuechange);
    this._track.removeEventListener('addcue', this._addcue);
  }
}

export default TrackHandler;
