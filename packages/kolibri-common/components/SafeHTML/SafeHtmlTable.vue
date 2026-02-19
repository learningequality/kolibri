<template>

  <div
    class="table-container"
    data-testid="table-container"
  >
    <table
      v-bind="$attrs"
      :style="tableStyle"
    >
      <slot></slot>
    </table>
  </div>

</template>


<script>

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

  .table-container {
    margin: 1em 0;
    overflow-x: auto;
  }

</style>
