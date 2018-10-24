<template>

  <popper
    :disabled="disabled"
    :visibleArrow="false"
    :options="options"
    trigger="hover"
    class="container d-ib"
  >
    <div
      slot="reference"
      class="d-ib"
    >
      <slot name="trigger"></slot>
    </div>
    <div
      dir="auto"
      class="popper-custom-skin"
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
              // enabled: true,
              escapeWithReference: true,
              // boundariesElement: 'viewport',
            },
            // hide: {
            //   enabled: false,
            // },
          },
        };
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri.styles.definitions';

  .container {
    position: relative;
    cursor: default;
  }

  .d-ib {
    display: inline-block;
  }

  .popper-custom-skin {
    position: absolute;
    z-index: 24;
    display: inline-block;
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

</style>
