import Vue from 'kolibri.lib.vue';

export default {
  computed: {
    alignStart() {
      return Vue.bidiDirection === 'rtl' ? 'right' : 'left';
    },
  },
};
