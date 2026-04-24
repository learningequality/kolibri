import mixin from '../../mixins/videojsMenuItemVueMixin';
import languagesMenuItem from './LanguagesMenuItem.vue';

class LanguagesMenuItem extends mixin(languagesMenuItem) {
  constructor(player, options = {}) {
    const track = options.track;

    // Copied from `TextTrackMenuItem`
    options.label = track.label || track.language || 'Unknown';

    super(player, options);
  }

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

  getLabel() {
    return this.localize(this.options_.label);
  }

  getTrack() {
    return this.options_.track;
  }
}

export default LanguagesMenuItem;
