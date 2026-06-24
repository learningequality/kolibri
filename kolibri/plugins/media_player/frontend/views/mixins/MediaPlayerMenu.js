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
     * Forward to the underlying menu's `contentEl()` for direct DOM access.
     * @returns {Element} The menu's content element.
     * @public
     */
    contentEl() {
      return this.menu.contentEl();
    },
    /**
     * Show the underlying menu.
     * @public
     */
    show() {
      this.menu.show();
    },
    /**
     * Hide the underlying menu.
     * @public
     */
    hide() {
      this.menu.hide();
    },
    /**
     * Whether the underlying menu is currently showing.
     * @returns {boolean} True when the menu is visible.
     * @public
     */
    showing() {
      return this.menu.showing();
    },
  },
};
