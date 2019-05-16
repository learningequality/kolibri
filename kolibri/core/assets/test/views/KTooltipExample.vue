<template>

  <div>
    <button ref="tooltipTriggerElement">
      Click me
    </button>
    <KTooltip
      :reference="kTooltipProps.reference"
      :refs="kTooltipProps.refs"
      :disabled="kTooltipProps.disabled"
      :placement="kTooltipProps.placement"
    >
      <slot></slot>
    </KTooltip>
  </div>

</template>


<script>

  import KTooltip from 'kolibri.coreVue.components.KTooltip';

  export default {
    name: 'KTooltipExample',
    components: {
      KTooltip,
    },
    props: {
      kTooltipProps: {
        type: Object,
        required: false,
        default: () => {},
      },
    },
  };

</script>


<style lang="scss" scoped></style>
