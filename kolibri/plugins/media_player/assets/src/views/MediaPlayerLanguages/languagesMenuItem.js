import mixin from '../../mixins/videojsMenuItemVueMixin';
import languagesMenuItem from './LanguagesMenuItem.vue';

class LanguagesMenuItem extends mixin(languagesMenuItem) {
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
}

export default LanguagesMenuItem;
