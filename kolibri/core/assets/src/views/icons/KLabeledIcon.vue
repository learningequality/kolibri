<template>

  <span class="labeled-icon-wrapper">
    <div class="icon">
      <slot name="icon"></slot>
    </div>
    <div class="label" :style="labelStyle">
      <slot></slot>
    </div>
  </span>

</template>


<script>

  export default {
    name: 'KLabeledIcon',
    components: {},
    props: {
      /**
       * Whether the label should wrap
       */
      nowrap: {
        type: Boolean,
        default: false,
      },
      /**
       * Whether the label should be bold
       */
      bold: {
        type: Boolean,
        default: false,
      },
    },
    computed: {
      labelStyle() {
        const labelStyle = {};
        if (this.nowrap) {
          labelStyle.whiteSpace = 'nowrap';
        }
        if (this.bold) {
          labelStyle.fontWeight = 'bold';
        }
        return labelStyle;
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri.styles.definitions';

  .labeled-icon-wrapper {
    position: relative;
    display: inline-block;
    white-space: nowrap;
  }

  .icon {
    position: absolute;
  }

  .label {
    display: block;
    margin-left: 1.925em;
  }

  .label svg {
    // if you see this, you need to pass the icon into the slot
    border: 1px solid red;
  }

</style>
