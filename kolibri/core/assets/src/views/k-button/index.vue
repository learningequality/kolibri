<template>

  <button
    ref="button"
    :class="buttonClasses"
    :type="type"
    :disabled="disabled"
    @click="handleClick">
    {{ text }}
  </button>

</template>


<script>

  /**
   * The kButton component is used to trigger actions
   */
  export default {
    name: 'kButton',
    props: {
      /**
       * Button label text
       */
      text: {
        type: String,
        required: true,
      },
      /**
       * Specifies 'primary' or 'secondary' style
       */
      primary: {
        type: Boolean,
        default: false,
      },
      /**
       * Button appearance: 'raised', 'flat', or 'link'
       */
      appearance: {
        type: String,
        default: 'raised',
      },
      /**
       * Whether or not button is disabled
       */
      disabled: {
        type: Boolean,
        default: false,
      },
      /**
       * HTML button 'type' attribute (e.g. 'submit', 'reset')
       */
      type: {
        type: String,
        default: 'button',
      },
    },
    computed: {
      buttonClasses() {
        if (this.primary && this.appearance === 'raised') {
          return ['button', 'primary', 'raised'];
        } else if (this.primary && this.appearance === 'flat') {
          return ['button', 'primary', 'flat'];
        } else if (this.primary && this.appearance === 'link') {
          return ['link', 'primary'];
        } else if (!this.primary && this.appearance === 'raised') {
          return ['button', 'secondary', 'raised'];
        } else if (!this.primary && this.appearance === 'flat') {
          return ['button', 'secondary', 'flat'];
        } else if (!this.primary && this.appearance === 'link') {
          return ['link', 'secondary'];
        }
      },
    },
    methods: {
      handleClick(event) {
        /**
         * Emitted when the button is triggered
         */
        this.$emit('click', event);
        this.$refs.button.blur();
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require './buttons.styl'

</style>
