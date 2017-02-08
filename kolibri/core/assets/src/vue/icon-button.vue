<template>

  <ui-button
    @click="$emit('click')"
    :color="primary ? 'primary' : 'default'"
    class="koli-icon-button">
    <span v-if="hasIcon && text">
      <ui-icon class="icon-margin"><slot/></ui-icon>
      {{ text }}
    </span>
    <span v-else-if="hasIcon">
      <ui-icon><slot/></ui-icon>
    </span>
    <span v-else>
      {{ text }}
    </span>
  </ui-button>

</template>


<script>

  module.exports = {
    props: {
      text: {
        type: String,
      },
      primary: {
        type: Boolean,
        default: false,
      },
      showTextBelowIcon: {
        type: Boolean,
        default: false,
      },
    },
    computed: {
      hasIcon() {
        // check if the parent passed anything into the slot
        // $slots returns an empty object if nothing is passed in.
        return !(Object.keys(this.$slots).length === 0 && this.$slots.constructor === Object);
      },
    },
    components: {
      UiButton: require('keen-ui').UiButton,
      UiIcon: require('keen-ui').UiIcon,
    },
  };

</script>


<style lang="stylus" scoped>

  .icon-margin
    margin-left: -0.25rem
    margin-right: 0.375rem
    margin-top: -0.125rem

</style>


<style lang="stylus">

  .koli-icon-button svg
    max-width: 24px
    max-height: 24px

</style>
