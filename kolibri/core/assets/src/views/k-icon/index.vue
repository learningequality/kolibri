<template>

  <ui-icon :ariaLabel="ariaLabel">
    <slot></slot>
  </ui-icon>

</template>


<script>

  import uiIcon from 'keen-ui/src/UiIcon';
  import uiTooltip from 'keen-ui/src/UiTooltip';

  export default {
    name: 'kIcon',
    components: {
      uiIcon,
      uiTooltip,
    },
    props: {
      ariaLabel: {
        type: String,
        required: true,
      },
      showTooltip: {
        type: Boolean,
        required: false,
        default: false,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

</style>
