<template>

  <button
    class="k-button"
    ref="button"
    :class="buttonClass"
    :type="type"
    :disabled="disabled"
    @click="handleClick">
    {{ text }}
  </button>

</template>


<script>

  /**
   * Used to initiate actions
   */
  export default {
    name: 'k-button',
    props: {
      /**
       * Text within button
       */
      text: {
        type: String,
        required: true,
      },
      /**
       * Primary or secondary button
       */
      primary: {
        type: Boolean,
        default: false,
      },
      /**
       * Raised or flat button
       */
      raised: {
        type: Boolean,
        default: true,
      },
      /**
       * Disabled state
       */
      disabled: {
        type: Boolean,
        default: false,
      },
      /**
       * HTML5 button type
       */
      type: {
        type: String,
        default: 'button',
      },
    },
    computed: {
      buttonClass() {
        if (this.primary && this.raised) {
          return 'k-button-primary-raised';
        } else if (this.primary && !this.raised) {
          return 'k-button-primary-flat';
        } else if (!this.primary && this.raised) {
          return 'k-button-secondary-raised';
        } else if (!this.primary && !this.raised) {
          return 'k-button-secondary-flat';
        }
      },
    },
    methods: {
      handleClick(event) {
        /**
         * Emits click event
         */
        this.$emit('click', event);
        this.$refs.button.blur();
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  $transition = all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1)
  $raised-shadow = 0 1px 5px rgba(0, 0, 0, 0.2), 0 2px 2px rgba(0, 0, 0, 0.14), 0 3px 1px -2px rgba(0, 0, 0, 0.12)

  .k-button
    background: none
    border: none
    display: inline-block
    cursor: pointer
    outline: none
    overflow: hidden
    text-align: center
    text-decoration: none
    user-select: none
    white-space: nowrap
    margin: 8px
    padding: 0 16px
    min-width: 64px
    min-height: 36px
    border-radius: 2px
    transition: $transition
    font-size: 14px
    font-weight: bold
    line-height: 36px
    text-transform: uppercase
    &:focus
      outline: none
    &::-moz-focus-inner
      border: none

  .k-button-primary-raised
    background-color: $core-action-normal
    color: white
    &:hover, &:focus
      background-color: $core-action-dark
    &:disabled
      background-color: rgba($core-action-normal, 0.75)
      color: rgba(white, 0.45)

  .k-button-primary-flat
    color: $core-action-normal
    &:hover, &:focus
      background-color: $core-grey-300
    &:disabled
      color: rgba($core-action-normal, 0.5)

  .k-button-secondary-raised
    background-color: $core-grey-200
    color: $core-text-default
    &:hover, &:focus
      background-color: $core-grey-300
    &:disabled
      background-color: rgba($core-text-default, 0.1)
      color: rgba($core-text-default, 0.25)

  .k-button-secondary-flat
    color: $core-text-default
    &:hover, &:focus
      background-color: $core-grey-300
    &:disabled
      color: rgba($core-text-default, 0.25)

  .k-button-primary-raised, .k-button-secondary-raised
    box-shadow: $raised-shadow

  .k-button-primary-raised, .k-button-primary-flat, .k-button-secondary-raised, .k-button-secondary-flat
    &:disabled
      box-shadow: none
      cursor: default
      pointer-events: none

</style>
