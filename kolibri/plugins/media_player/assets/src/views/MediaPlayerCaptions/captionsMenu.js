import connector from '../../utils/videojsVueConnector';
import captionsMenu from './CaptionsMenu.vue';
import CaptionsMenuItem from './captionsMenuItem';

const BaseCaptionsMenu = connector('Menu', captionsMenu);

class CaptionsMenu extends BaseCaptionsMenu {
  /**
   * @param {Object} [options]
   * @return {VueComponent}
   */
  createVueComponent(options) {
    const component = super.createVueComponent(
      Object.assign(
        {
          propsData: {
            settings: this.getSettings(),
            activeLanguage: '',
          },
        },
        options
      )
    );
    component.$on('changeKind', (kind, isActive) => this.handleKindChange(kind, isActive));
    return component;
  }

  /**
   * `contentEl` is used when `addItem` is called, so this allows the addition of the text track
   * options (the languages) in the right spot
   *
   * @return {*|Element}
   */
  contentEl() {
    return this.getVueComponent().contentEl();
  }

  /**
   * Override parent's method, which adds event handlers we don't want
   *
   * @param {CaptionsMenuItem|Component|String} item The name or instance of the item to add
   */
  addItem(item) {
    this.addChild(item);

    item.on('change', () => this.onChange());
    this.onChange();
  }

  /**
   * Handle language change
   */
  onChange() {
    const activeItem = this.getCaptionItems().find(item => item.isSelected());

    this.getVueComponent().$props.activeLanguage = activeItem ? activeItem.getLabel() : '';
  }

  /**
   * @param {String} kind
   * @param {Boolean} isActive
   */
  handleKindChange(kind, isActive) {
    this.getCaptionItems().forEach(item => {
      if (isActive) {
        item.getTrack().enableKind(kind);
      } else {
        item.getTrack().disableKind(kind);
      }
    });
  }

  /**
   * Disables default show/hide functionality, which is triggered on hover. `lockShowing()` gets
   * called instead on click.
   */
  show() {}
  hide() {}

  /**
   * Triggered on click in ancestor
   */
  lockShowing() {
    const component = this.getVueComponent();

    if (!component || component.showing()) {
      return;
    }

    component.show();
    this.trigger('show');
  }

  /**
   * Triggered on blur in ancestor
   */
  unlockShowing() {
    const component = this.getVueComponent();

    if (!component || !component.showing()) {
      return;
    }

    component.hide();
    this.trigger('hide');
  }

  /**
   * @return {CaptionsMenuItem[]}
   */
  getCaptionItems() {
    return this.children().filter(item => item instanceof CaptionsMenuItem);
  }
}

export default CaptionsMenu;
