import videojs from 'video.js';

const MenuItem = videojs.getComponent('MenuItem');

/**
 * This videojs Component outputs the individual languages available to the Transcript. A good
 * portion of this was taken from videojs.TextTrackMenuItem since it does what we need, with
 * the exception that we don't want this to sync any changes or listen to any changes to the
 * actual video text track
 */
class TranscriptMenuItem extends MenuItem {
  constructor(player, options) {
    const track = options.track;

    // Modify options for parent MenuItem class's init.
    options.label = track.label || track.language || 'Unknown';
    options.selected = track.mode === 'hidden';

    super(player, options);

    this.track = track;
  }

  activate() {
    this.trigger('activate');
    this.selected(true);
  }

  handleClick() {
    this.activate();
  }

  deactivate() {
    this.selected(false);
  }

  /**
   * @returns {Boolean}
   */
  isActive() {
    return this.isSelected_;
  }

  dispose() {
    // remove reference to track object on dispose
    this.track = null;

    super.dispose();
  }
}

export default TranscriptMenuItem;
