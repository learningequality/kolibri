import connector from '../../utils/videojsVueConnector';
import captionsMenu from './CaptionsMenu.vue';

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
   * @override
   * @return {*|Element}
   */
  contentEl() {
    return this.getVueComponent().contentEl();
  }

  /**
   * Override parent's method, which adds event handlers we don't want
   *
   * @override
   * @param {CaptionsMenuItem|Component|String} item The name or instance of the item to add
   */
  addItem(item) {
    this.addChild(item);
  }

  /**
   * Disables default show/hide functionality, which is triggered on hover. `lockShowing()` gets
   * called instead on click.
   *
   * @override
   */
  show() {}
  hide() {}

  /**
   * Triggered on click in ancestor
   *
   * @override
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
   *
   * @override
   */
  unlockShowing() {
    const component = this.getVueComponent();

    if (!component || !component.showing()) {
      return;
    }

    component.hide();
    this.trigger('hide');
  }
}

export default CaptionsMenu;
