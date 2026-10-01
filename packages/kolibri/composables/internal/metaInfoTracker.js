import { ref } from 'vue';

export const metaInfoComponents = ref(0);

/**
 * Global mixin counting mounted components that set vue-meta's `metaInfo`,
 * so usePageTitle leaves document.title to vue-meta while any is mounted.
 */
export default {
  beforeCreate() {
    if (this.$options.metaInfo) {
      metaInfoComponents.value++;
      this.$once('hook:destroyed', () => metaInfoComponents.value--);
    }
  },
};
