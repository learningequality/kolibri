<template>

  <popper
    class="container d-ib"
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
      class="popper"
    >
      <slot name="tooltip"></slot>
    </div>
  </popper>

</template>


<script>

  import Popper from 'vue-popperjs';
  import 'vue-popperjs/dist/css/vue-popper.css';

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

  .container {
    position: relative;
    cursor: pointer;
  }

  .d-ib {
    display: inline-block;
  }

</style>
