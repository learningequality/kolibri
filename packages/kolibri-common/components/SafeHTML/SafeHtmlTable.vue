<template>

  <div
    ref="container"
    class="table-container"
    data-testid="table-container"
    :tabindex="overflowing ? 0 : null"
    :style="containerStyle"
  >
    <table
      class="safe-html"
      v-bind="$attrs"
      :style="[contentStyle, tableStyle]"
    >
      <slot></slot>
    </table>
  </div>

</template>


<script>

  import { onMounted, onUpdated, ref } from 'vue';
  import { useEventListener, useResizeObserver } from '@vueuse/core';
  import parseStyleString from './parseStyleString';

  export default {
    name: 'SafeHtmlTable',
    inheritAttrs: false,

    setup() {
      const container = ref(null);
      const overflowing = ref(false);

      function measure() {
        if (container.value) {
          overflowing.value = container.value.scrollWidth > container.value.clientWidth;
        }
      }

      onMounted(measure);
      // Slot content can change the table's width without the container resizing.
      onUpdated(measure);
      // Both auto-dispose on unmount. The observer catches a container narrowed
      // without a window resize; the listener covers the browserslist targets
      // that predate ResizeObserver.
      useResizeObserver(container, measure);
      useEventListener(window, 'resize', measure);

      return { container, overflowing };
    },

    props: {
      node: {
        required: true,
        validator: node => node && typeof node.querySelector === 'function',
      },
    },

    computed: {
      containerStyle() {
        return {
          '--table-focus-outline': this.$themeTokens.focusOutline,
          '--table-caption-align': this.overflowing ? 'start' : 'center',
          '--table-caption-color': this.$themeBrand.primary.v_500,
          '--table-head-background': this.$themeBrand.primary.v_100,
          '--table-foot-background': this.$themePalette.grey.v_100,
          '--table-border': `1px solid ${this.$themePalette.grey.v_300}`,
        };
      },
      // The allowlisted style carried through from the sanitized <table>. Merged
      // ahead of tableStyle so the component's own width wins on any future key
      // overlap while the carried alignment/colour still apply.
      contentStyle() {
        return parseStyleString(this.$attrs.style);
      },
      tableStyle() {
        const firstRow = this.node.querySelector('tr');
        const colCount = firstRow ? firstRow.children.length : 0;

        return {
          width: colCount <= 3 ? '640px' : `${colCount * 200}px`,
        };
      },
    },
  };

</script>


<style scoped>

  /* Negative margins cancel the extra width, so wide tables scroll full-bleed. */
  .table-container {
    width: calc(100% + 32px);
    padding: 0 16px;
    margin: 1em -16px;
    overflow-x: auto;
  }

  .table-container:focus-visible {
    outline: 3px solid var(--table-focus-outline) !important;
    outline-offset: -3px !important;
  }

  table.safe-html {
    min-width: 640px;
    margin: 16px auto;
    font-size: 16px;
    table-layout: fixed;
    border-collapse: collapse;
    border: var(--table-border);
  }

  /* Slot content carries the parent's scope id, not this component's. */
  /deep/ caption.safe-html {
    margin: 0 auto 12px;
    font-weight: 600;
    color: var(--table-caption-color);
    text-align: var(--table-caption-align);
  }

  /deep/ thead.safe-html {
    font-weight: 600;
    background-color: var(--table-head-background);
  }

  /deep/ tfoot.safe-html {
    background-color: var(--table-foot-background);
  }

  /deep/ th.safe-html {
    font-weight: 600;
    text-align: left;
  }

  /deep/ th.safe-html,
  /deep/ td.safe-html {
    min-width: 200px;
    padding: 16px;
    border: var(--table-border);
  }

</style>
