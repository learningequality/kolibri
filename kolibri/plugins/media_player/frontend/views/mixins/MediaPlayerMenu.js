/**
 * Mixin that connects a component to a child MediaPlayerMenu component
 */
export default {
  computed: {
    menu() {
      return this.$children[0];
    },
  },
  methods: {
    /**
     * @public
     * @return {Element}
     */
    contentEl() {
      return this.menu.contentEl();
    },
    /**
     * @public
     */
    show() {
      this.menu.show();
    },
    /**
     * @public
     */
    hide() {
      this.menu.hide();
    },
    /**
     * @public
     * @return {boolean}
     */
    showing() {
      return this.menu.showing();
    },
  },
};
