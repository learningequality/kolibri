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

  export default {
    name: 'KTooltipExample',
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
