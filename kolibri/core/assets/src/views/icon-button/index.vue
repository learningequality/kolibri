<template>

  <button
    class="k-button"
    ref="button"
    :class="classes"
    :type="type"
    :disabled="disabled"
    @click="handleClick">
    {{ text }}
  </button>

</template>


<script>

  export default {
    props: {
      text: {
        type: String,
        required: true,
      },
      primary: {
        type: Boolean,
        default: false,
      },
      raised: {
        type: Boolean,
        default: true,
      },
      disabled: {
        type: Boolean,
        default: false,
      },
      type: { type: String },
    },
    computed: {
      classes() {
        let classes = [];
        if (this.primary && this.raised) {
          classes.push('k-button-primary-raised');
        } else if (this.primary && !this.raised) {
          classes.push('k-button-primary-flat');
        } else if (!this.primary && this.raised) {
          classes.push('k-button-secondary-raised');
        } else if (!this.primary && !this.raised) {
          classes.push('k-button-secondary-flat');
        }
        if (this.disabled) {
          classes.push('k-button-disabled');
        }
        return classes;
      },
    },
    methods: {
      handleClick(event) {
        this.$emit('click', event);
        this.$refs.button.blur();
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  $grey-200 = #EEEEEE
  $grey-300 = #E0E0E0
  $transition = all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1)
  $raised-shadow = 0 1px 5px rgba(0, 0, 0, 0.2), 0 2px 2px rgba(0, 0, 0, 0.14), 0 3px 1px -2px rgba(0, 0, 0, 0.12)

  .k-button
    display: inline-block
    margin: 8px
    padding: 0 16px
    min-width: 64px
    min-height: 36px
    overflow: hidden
    user-select: none
    cursor: pointer
    outline: none
    background: none
    border: none
    border-radius: 2px
    transition: $transition
    font-size: 14px
    font-weight: bold
    line-height: 36px
    text-align: center
    text-transform: uppercase
    text-decoration: none
    vertical-align: top
    white-space: nowrap
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
      color: rgba(white, 0.5)

  .k-button-primary-flat
    color: $core-action-normal
    &:hover, &:focus
      background-color: $grey-300
    &:disabled
      color: rgba($core-action-normal, 0.5)

  .k-button-secondary-raised
    background-color: $grey-200
    color: $core-text-default
    &:hover, &:focus
      background-color: $grey-300
    &:disabled
      background-color: rgba($grey-200, 0.75)
      color: rgba($core-text-default, 0.5)

  .k-button-secondary-flat
    color: $core-text-default
    &:hover, &:focus
      background-color: $grey-300
    &:disabled
      color: rgba($core-text-default, 0.5)

  .k-button-primary-raised, .k-button-secondary-raised
    box-shadow: $raised-shadow

  .k-button-disabled
    box-shadow: none
    cursor: default
    pointer-events: none

</style>
