import Vue from 'kolibri.lib.vue';

export default {
  computed: {
    align() {
      return Vue.bidi === 'rtl' ? 'right' : 'left';
    },
  },
};
