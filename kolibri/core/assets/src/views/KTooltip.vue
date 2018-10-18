<template>

  <popper
    class="container d-ib"
    :class="{ 'cursor' :!disabled}"
    trigger="hover"
    :disabled="disabled"
    :options="options"
  >
    <div
      slot="reference"
      class="d-ib"
    >
      <slot name="trigger"></slot>
    </div>
    <div
      dir="auto"
      class="popper-custom"
    >
      <slot name="tooltip"></slot>
    </div>
  </popper>

</template>


<script>

  import Popper from 'vue-popperjs';

  export default {
    name: 'KTooltip',
    components: {
      Popper,
    },
    props: {
      disabled: {
        type: Boolean,
        default: false,
      },
      placement: {
        type: String,
        default: 'auto',
      },
    },
    computed: {
      options() {
        return {
          placement: this.placement,
          modifiers: {
            preventOverflow: {
              escapeWithReference: true,
              boundariesElement: 'viewport',
            },
          },
        };
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri.styles.definitions';

  $box-shadow: 0 2px 1px -1px rgba(0, 0, 0, 0.2), 0 1px 1px 0 rgba(0, 0, 0, 0.14),
    0 1px 3px 0 rgba(0, 0, 0, 0.12);

  .popper-custom {
    position: absolute;
    z-index: 24;
    display: inline-block;
    padding: 8px;
    font-size: 14px;
    font-weight: normal;
    color: white;
    text-align: center;
    background-color: $core-text-default;
    border-radius: 8px;
    box-shadow: $box-shadow;
  }

  /deep/ .popper-custom .popper__arrow {
    display: none;
  }

  .cursor {
    cursor: default;
  }

  .container {
    position: relative;
  }

  .d-ib {
    display: inline-block;
  }

</style>
