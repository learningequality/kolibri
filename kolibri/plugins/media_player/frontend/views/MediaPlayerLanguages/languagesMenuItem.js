import mixin from '../../mixins/videojsMenuItemVueMixin';
import languagesMenuItem from './LanguagesMenuItem.vue';

class LanguagesMenuItem extends mixin(languagesMenuItem) {
  /**
   * Construct a single language entry, defaulting its label from the underlying text track.
   * @param {object} player - The video.js player instance.
   * @param {object} [options] - Configuration for this menu item, forwarded on to the
   * parent class after the label is defaulted from the track.
   * @param {TextTrack} options.track - The text track represented by this menu item.
   */
  constructor(player, options = {}) {
    const track = options.track;

    // Copied from `TextTrackMenuItem`
    options.label = track.label || track.language || 'Unknown';

    super(player, options);
  }

  /**
   * Mount the Vue component for this menu item, passing the localised label and
   * the language code as props.
   * @param {object} [options] - Additional options forwarded to the parent component.
   * @returns {object} The mounted Vue component instance.
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
        options,
      ),
    );
  }

  /**
   * Localise this entry's label, using the locale configured on the player.
   * @returns {string} The localised label for the menu item.
   */
  getLabel() {
    return this.localize(this.options_.label);
  }

  /**
   * Access the text track this menu item represents.
   * @returns {TextTrack} The underlying text track.
   */
  getTrack() {
    return this.options_.track;
  }
}

export default LanguagesMenuItem;
