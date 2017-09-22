<template>

  <router-link :class="buttonClasses" :to="to">
    <!-- Link label text -->
    <slot />
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
       * <router-link :to="..."> property
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
