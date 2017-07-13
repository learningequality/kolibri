import Vue from 'kolibri.lib.vue';

export default {
  computed: {
    alignStart() {
      return this.isRtl ? 'right' : 'left';
    },
  },
};
