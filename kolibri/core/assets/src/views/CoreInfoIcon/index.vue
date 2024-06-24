<template>

  <span class="pos-rel">
    <UiIcon
      ref="icon"
      class="info-icon"
      :style="{ color: $themeTokens.primary }"
      :iconAriaLabel="iconAriaLabel"
    >
      <KIcon
        icon="info"
        :style="{ fill: $themeTokens.primary }"
      />
    </UiIcon>
    <KTooltip
      reference="icon"
      :class="{ ltr: !isRtl }"
      :refs="$refs"
      :placement="tooltipPlacement"
    >
      {{ tooltipText }}
    </KTooltip>
  </span>

</template>


<script>

  import UiIcon from 'kolibri-design-system/lib/keen/UiIcon';

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
        default: 'bottom',
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

  // Overwrite KIcon styles to make it compatible with UIIcon
  /deep/ svg {
    top: 0;
    width: 100%;
    height: 100%;
  }

  .pos-rel {
    position: relative;
  }

</style>
