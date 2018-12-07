<template>

  <!-- no extra whitespace inside link -->
  <router-link :class="buttonClasses" :to="to" dir="auto">{{ text }}</router-link>

</template>


<script>

  import { validator } from './appearances.js';
  import buttonClassesMixin from './buttonClassesMixin.js';

  /**
   * KRouterLink creates a styled router-link
   */
  export default {
    name: 'KRouterLink',
    mixins: [buttonClassesMixin],
    props: {
      /**
       * Link text
       */
      text: {
        type: String,
        required: true,
      },
      /**
       * Link appearance: 'raised-button', 'flat-button', or 'basic-link'
       */
      appearance: {
        type: String,
        default: 'basic-link',
        validator,
      },
      /**
       * For 'raised-button' and 'flat-button' appearances: show as primary or secondary style
       */
      primary: {
        type: Boolean,
        default: false,
      },
      /**
       * vue-router link object
       */
      to: {
        required: true,
        type: Object,
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import './buttons';

</style>
