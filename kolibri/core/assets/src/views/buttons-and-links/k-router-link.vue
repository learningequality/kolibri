<template>

  <router-link :class="buttonClasses" :to="to">
    {{ text }}
  </router-link>

</template>


<script>

  import { validator } from './appearances.js';
  import buttonClassesMixin from './buttonClassesMixin.js';

  /**
   * kRouterLink creates a styled router-link
   */
  export default {
    name: 'kRouterLink',
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


<style lang="stylus" scoped>

  @require './buttons.styl'

</style>
