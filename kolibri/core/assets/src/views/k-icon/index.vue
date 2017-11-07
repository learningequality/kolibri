<template>

  <div class="k-icon-wrapper">
    <ui-icon
      :ariaLabel="ariaLabel"
      ref="icon"
    >
      <slot></slot>
    </ui-icon>

    <ui-tooltip
      v-if="showTooltip"
      trigger="icon"
    >
      {{ ariaLabel }}
    </ui-tooltip>
  </div>

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

  .k-icon-wrapper
    display: inline-block

</style>
