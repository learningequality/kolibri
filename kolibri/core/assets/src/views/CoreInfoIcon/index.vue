<template>

  <KTooltip :placement="tooltipPlacement">
    <UiIcon
      slot="trigger"
      class="info-icon"
      :iconAriaLabel="iconAriaLabel"
    >
      <mat-svg name="info" category="action" />
    </UiIcon>
    <div slot="tooltip">
      {{ tooltipText }}
    </div>
  </KTooltip>

</template>


<script>

  import UiIcon from 'keen-ui/src/UiIcon';
  import KTooltip from 'kolibri.coreVue.components.KTooltip';

  export default {
    name: 'CoreInfoIcon',
    components: {
      UiIcon,
      KTooltip,
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
      tooltipPlacement: {
        type: String,
        required: false,
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri.styles.definitions';

  .info-icon {
    display: inline-block;
    font-size: 1.2em;
    color: $core-accent-color;
    vertical-align: top;
    cursor: pointer;
  }

</style>
