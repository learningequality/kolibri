<template>

  <ui-button
    @click="$emit('click')"
    :color="primary ? 'primary' : 'default'"
    class="koli-icon-button">
    <slot/>
    {{ text }}
  </ui-button>

</template>


<script>

  import UiButton from 'keen-ui/src/UiButton';

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
    components: { UiButton },
  };

</script>


<style lang="stylus" scoped></style>


<style lang="stylus">

  .koli-icon-button svg
    max-width: 24px
    max-height: 24px

</style>
