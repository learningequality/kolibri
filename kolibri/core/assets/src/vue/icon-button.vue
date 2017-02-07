<template>

  <ui-button
    @click="$emit('click')"
    :color="primary ? 'primary' : 'default'">
    <slot/>
    {{ text }}
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
    },
  };

</script>


<style lang="stylus" scoped>

  @import '~keen-ui/dist/keen-ui.css'

</style>
