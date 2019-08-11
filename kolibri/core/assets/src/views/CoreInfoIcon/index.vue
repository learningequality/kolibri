<template>

  <span class="pos-rel">
    <UiIcon
      ref="icon"
      class="info-icon"
      :style="{ color: $themeTokens.primary }"
      :iconAriaLabel="iconAriaLabel"
    >
      <mat-svg name="info" category="action" />
    </UiIcon>
    <KTooltip
      reference="icon"
      :refs="$refs"
      :placement="tooltipPlacement"
    >
      {{ tooltipText }}
    </KTooltip>
  </span>

</template>


<script>

  import UiIcon from 'keen-ui/src/UiIcon';

  export default {
    name: 'CoreInfoIcon',
    components: {
      UiIcon,
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

  .info-icon {
    display: inline-block;
    font-size: 1.2em;
    vertical-align: top;
    cursor: pointer;
  }

  .pos-rel {
    position: relative;
  }

</style>
