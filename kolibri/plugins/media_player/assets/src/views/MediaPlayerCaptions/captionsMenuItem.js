import connector from '../../utils/videojsVueConnector';
import captionsMenuItem from './CaptionsMenuItem.vue';

const BaseCaptionsMenuItem = connector('MenuItem', captionsMenuItem);

class CaptionsMenuItem extends BaseCaptionsMenuItem {
  /**
   * @param {Player} player
   * @param {Object} options
   * @param {TextTrackLanguageGroup} options.track
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
    const component = super.createVueComponent(
      Object.assign(
        {
          propsData: {
            label: this.localize(this.options_.label),
            selected: this.getTrack().isEnabled(),
          },
        },
        options
      )
    );

    component.$on('change', () => {
      this.selected(true);
      this.trigger('change');
    });
    return component;
  }

  /**
   * @override
   * @param selected
   */
  selected(selected) {
    this.getVueComponent().$props.selected = selected;

    if (selected) {
      this.getTrack().enable();
    } else {
      this.getTrack().disable();
    }
  }

  /**
   * @return {boolean}
   */
  isSelected() {
    return this.getTrack().isEnabled();
  }

  /**
   * @return {TextTrackLanguageGroup}
   */
  getTrack() {
    return this.options_.track;
  }

  /**
   * We don't need to handle clicks
   */
  handleClick() {}
}

export default CaptionsMenuItem;
