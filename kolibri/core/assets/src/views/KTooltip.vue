<template>

  <popper
    :reference="reference"
    :disabled="disabled"
    :visibleArrow="false"
    :options="options"
    trigger="hover"
    class="d-b"
  >
    <div
      dir="auto"
      class="popper-custom-skin"
    >
      <!--Default slot that will contain the tooltip content.-->
      <slot></slot>
    </div>
  </popper>

</template>


<script>

  import Popper from 'vue-popperjs';

  /**
   * Used to create a tooltip.
   */
  export default {
    name: 'KTooltip',
    components: {
      Popper,
    },
    props: {
      /**
       * Element tooltip will be positioned relative to
       */
      reference: {
        type: HTMLElement,
        required: true,
      },
      /**
       * Whether or not tooltip is disabled
       */
      disabled: {
        type: Boolean,
        default: false,
      },
      /**
       * Placement of tooltip relative to reference element. Supports any popper.js placement string
       */
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
              // enabled: true,
              // escapeWithReference: true,
              // boundariesElement: 'viewport',
            },
          },
        };
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri.styles.definitions';

  .popper-custom-skin {
    position: absolute;
    z-index: 24;
    min-width: 75px;
    padding: 8px;
    font-size: 12px;
    font-weight: normal;
    line-height: 1.4;
    color: white;
    text-align: center;
    background-color: $core-text-default;
    border-radius: 8px;
    box-shadow: 0 2px 1px -1px rgba(0, 0, 0, 0.2), 0 1px 1px 0 rgba(0, 0, 0, 0.14),
      0 1px 3px 0 rgba(0, 0, 0, 0.12);
  }

  .d-b {
    display: block;
  }

</style>
