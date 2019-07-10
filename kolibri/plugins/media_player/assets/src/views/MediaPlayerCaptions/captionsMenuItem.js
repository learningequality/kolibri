import connector from '../../utils/videojsVueConnector';
import captionsMenuItem from './CaptionsMenuItem.vue';

const BaseCaptionsMenuItem = connector('MenuItem', captionsMenuItem);

class CaptionsMenuItem extends BaseCaptionsMenuItem {
  /**
   * @param {Player} player
   * @param {Object} options
   * @param {TextTrack} options.track
   */
  constructor(player, options = {}) {
    const track = options.track;

    // Copied from `TextTrackMenuItem`
    options.label = track.label || track.language || 'Unknown';

    super(player, options);
  }

  /**
   * @param {Object} [options]
   * @return {VueComponent}
   */
  createVueComponent(options = {}) {
    return super.createVueComponent(
      Object.assign(
        {
          propsData: {
            label: this.getLabel(),
            value: this.getTrack().language,
          },
        },
        options
      )
    );
  }

  /**
   * @return {String}
   */
  getLabel() {
    return this.localize(this.options_.label);
  }

  /**
   * @return {TextTrack}
   */
  getTrack() {
    return this.options_.track;
  }

  /**
   * @override
   */
  selected() {}

  /**
   * We don't need to handle clicks
   * @override
   */
  handleClick() {}
}

export default CaptionsMenuItem;
