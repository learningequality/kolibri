<template>

  <div
    class="table-container"
    data-testid="table-container"
    :style="{ '--table-focus-outline': $themeTokens.focusOutline }"
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

  import parseStyleString from './parseStyleString';

  export default {
    name: 'SafeHtmlTable',
    inheritAttrs: false,

    props: {
      node: {
        required: true,
        validator: node => node && typeof node.querySelector === 'function',
      },
    },

    computed: {
      // The allowlisted style carried through from the sanitized <table>. Merged
      // ahead of tableStyle so the component's own width/border win on any future
      // key overlap while the carried alignment/colour still apply.
      contentStyle() {
        return parseStyleString(this.$attrs.style);
      },
      tableStyle() {
        const firstRow = this.node.querySelector('tr');
        const colCount = firstRow ? firstRow.children.length : 0;

        const styles = {
          border: `1px solid ${this.$themePalette.grey.v_300}`,
        };

        if (colCount <= 3) {
          styles.width = '640px';
        } else {
          styles.width = `${colCount * 200}px`;
        }

        return styles;
      },
    },

    mounted() {
      this.applyThemeColors();
    },

    updated() {
      this.applyThemeColors();
    },

    methods: {
      applyThemeColors() {
        if (!this.$el) return;

        const table = this.$el.querySelector('table');
        if (!table) return;

        const captions = table.querySelectorAll('caption.safe-html');
        captions.forEach(caption => {
          caption.style.color = this.$themeBrand.primary.v_500;
        });

        const theads = table.querySelectorAll('thead.safe-html');
        theads.forEach(thead => {
          thead.style.backgroundColor = this.$themeBrand.primary.v_100;
        });

        const tfoots = table.querySelectorAll('tfoot.safe-html');
        tfoots.forEach(tfoot => {
          tfoot.style.backgroundColor = this.$themePalette.grey.v_100;
        });

        const cells = table.querySelectorAll('th.safe-html, td.safe-html');
        cells.forEach(cell => {
          cell.style.border = `1px solid ${this.$themePalette.grey.v_300}`;
        });
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
  }

  /* Slot content carries the parent's scope id, not this component's. */
  /deep/ caption.safe-html {
    margin: 0 auto 12px;
    font-weight: 600;
  }

  /deep/ caption.safe-html.small-window {
    text-align: start;
  }

  /deep/ thead.safe-html {
    font-weight: 600;
  }

  /deep/ th.safe-html {
    font-weight: 600;
    text-align: left;
  }

  /deep/ th.safe-html,
  /deep/ td.safe-html {
    min-width: 200px;
    padding: 16px;
  }

</style>
