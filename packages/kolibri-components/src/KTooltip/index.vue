<template>

  <Popper
    v-if="readyToInit"
    :reference="htmlElement"
    :disabled="disabled"
    :visibleArrow="false"
    :options="options"
    trigger="hover"
  >
    <div
      dir="auto"
      class="k-tooltip"
      :style="{ backgroundColor: $themeTokens.text, color: $themeTokens.textInverted }"
    >
      <!--Default slot that will contain the tooltip content.-->
      <slot></slot>
    </div>
  </Popper>

</template>


<script>

  import isArray from 'lodash/isArray';
  import Popper from './Popper';

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
       * String of ref which tooltip will be positioned relative to.
       */
      reference: {
        type: String,
        required: true,
      },
      /**
       * Parent's refs object which should contain the reference.
       */
      refs: {
        type: Object,
        default: () => {},
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
        default: 'bottom',
      },
    },
    data() {
      return {
        mounted: false,
      };
    },
    computed: {
      readyToInit() {
        return this.mounted && this.htmlElement;
      },
      options() {
        return {
          placement: this.placement,
        };
      },
      htmlElement() {
        let element = this.refs[this.reference];
        if (!element) {
          return null;
        }
        if (isArray(element)) {
          element = element[0];
        }
        if (element._isVue) {
          element = element.$el;
        }
        return element;
      },
    },
    mounted() {
      this.$nextTick(() => {
        this.mounted = true;
      });
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri.styles.definitions';

  .k-tooltip {
    @extend %dropshadow-1dp;

    position: absolute;
    z-index: 24;
    width: max-content;
    min-width: 75px;
    max-width: calc(100vw - 10px);
    padding: 8px;
    font-size: 12px;
    font-weight: normal;
    line-height: 1.4;
    text-align: center;
    border-radius: 8px;
  }

</style>
