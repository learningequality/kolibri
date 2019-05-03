import videojs from 'video.js';
import TranscriptMenuItem from './transcriptMenuItem';
import TranscriptOffMenuItem from './transcriptOffMenuItem';
import transcriptIcon from './transcript-icon.svg';

const TextTrackButton = videojs.getComponent('TextTrackButton');
const OffTextTrackMenuItem = videojs.getComponent('OffTextTrackMenuItem');

/**
 * The Component for the Button that will open the Transcript
 */
class TranscriptButton extends TextTrackButton {
  /**
   * @param player
   * @param {Object} options
   */
  constructor(player, options) {
    super(player, options);

    const iconHolder = this.$('.vjs-icon-placeholder');
    const icon = videojs.dom.createEl('img', {
      src: transcriptIcon,
      alt: this.controlText_,
    });
    videojs.dom.prependTo(icon, iconHolder);
  }

  /**
   * @returns {string}
   */
  buildCSSClass() {
    return `vjs-transcript-button ${super.buildCSSClass()}`;
  }

  /**
   * @returns {string}
   */
  buildWrapperCSSClass() {
    return `vjs-transcript-button ${super.buildWrapperCSSClass()}`;
  }

  handleClick() {
    this.trigger('toggleTranscript');
  }

  /**
   * @returns {TranscriptMenuItem[]}
   */
  createItems() {
    return super.createItems([], TranscriptMenuItem).map(item => {
      // Replace `OffTextTrackMenuItem` which messes with our handling
      if (item instanceof OffTextTrackMenuItem) {
        item = new TranscriptOffMenuItem(this.player(), {
          kind: this.kind_,
          label: `${this.label_} off`,
        });
        item.selected(true);
      } else {
        item.selected(false);
      }

      item.on('activate', () => {
        this.items.forEach(otherItem => {
          otherItem.selected(item.id_ === otherItem.id_);
        });
        this.trigger('trackChange');
      });
      return item;
    });
  }

  /**
   * @returns {TextTrack[]}
   */
  getTracks() {
    return this.items
      .map(item => {
        if (item instanceof TranscriptOffMenuItem) {
          return null;
        }

        return item.track;
      })
      .filter(Boolean);
  }

  /**
   * @returns {TranscriptMenuItem|null}
   */
  getActiveItem() {
    return this.items.find(item => item.isActive());
  }

  /**
   * @param {TextTrack} track
   */
  selectTrack(track) {
    this.items.forEach(item => {
      item.selected(item.track && item.track.id === track.id);
    });
  }

  /**
   * @returns {TextTrack|null}
   */
  getActiveTrack() {
    const item = this.getActiveItem();
    return item && !(item instanceof TranscriptOffMenuItem) ? item.track : null;
  }
}

TranscriptButton.prototype.kind_ = 'metadata';
TranscriptButton.prototype.controlText_ = 'Transcript';
TranscriptButton.prototype.label_ = 'Transcript';

export default TranscriptButton;
