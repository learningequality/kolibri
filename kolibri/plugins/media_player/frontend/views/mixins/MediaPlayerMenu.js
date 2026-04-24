/**
 * Mixin that connects a component to a child MediaPlayerMenu component.
 */
export default {
  computed: {
    menu() {
      return this.$children[0];
    },
  },
  methods: {
    contentEl() {
      return this.menu.contentEl();
    },
    show() {
      this.menu.show();
    },
    hide() {
      this.menu.hide();
    },
    showing() {
      return this.menu.showing();
    },
  },
};
