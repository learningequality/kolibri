<template>

  <a :class="buttonClasses" :href="href">
    {{ text }}
  </a>

</template>


<script>

  import buttonClassesMixin from './buttonClassesMixin.js';

  /**
   * kExternalLink creates a styled external link
   */
  export default {
    name: 'kExternalLink',
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
       * URL string
       */
      href: {
        type: String,
        required: true,
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
