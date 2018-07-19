<template>

  <div class="info-icon-container">
    <UiIcon
      ref="info-icon"
      class="info-icon"
      :iconAriaLabel="iconAriaLabel"
    >
      <mat-svg name="info" category="action" />
    </UiIcon>
    <UiTooltip
      trigger="info-icon"
      class="info-icon-tooltip"
      :position="tooltipPosition"
    >
      {{ tooltipText }}
    </UiTooltip>
  </div>

</template>


<script>

  import UiIcon from 'keen-ui/src/UiIcon';
  import UiTooltip from 'keen-ui/src/UiTooltip';

  export default {
    name: 'CoreInfoIcon',
    components: {
      UiIcon,
      UiTooltip,
    },
    props: {
      iconAriaLabel: {
        type: String,
        required: true,
      },
      tooltipText: {
        type: String,
        required: true,
      },
      tooltipPosition: {
        type: String,
        required: true,
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri.styles.definitions';

  .info-icon-container {
    display: inline-block;
  }

  .info-icon {
    font-size: 1.2em;
    color: $core-accent-color;
    vertical-align: top;
    cursor: pointer;
  }

</style>
