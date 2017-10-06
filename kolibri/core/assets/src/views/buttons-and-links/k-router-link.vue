<template>

  <router-link :class="buttonClasses" :to="to">
    {{ text }}
  </router-link>

</template>


<script>

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
       * vue-router link object
       */
      to: {
        required: true,
        type: Object,
      },
      /**
       * Link appearance: 'raised', 'flat', or 'link'
       */
      appearance: {
        type: String,
        default: 'link',
      },
      /**
       * For 'raised' and 'flat' button-like appearance: show as primary or secondary style
       */
      primary: {
        type: Boolean,
        default: false,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require './buttons.styl'

</style>
