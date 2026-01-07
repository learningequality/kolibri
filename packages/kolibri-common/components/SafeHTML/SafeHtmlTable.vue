<template>

  <div
    class="table-container"
    data-testid="table-container"
  >
    <table
      :style="tableStyle"
      v-bind="attributes"
    >
      <component :is="renderTableContent" />
    </table>
  </div>

</template>


<script>

  export default {
    name: 'SafeHtmlTable',
    props: {
      node: {
        required: true,
        validator: prop => typeof prop === 'object' && prop !== null,
      },
      attributes: {
        type: Object,
        required: true,
      },
      mapChildren: {
        type: Function,
        required: true,
      },
    },

    computed: {
      tableStyle() {
        const firstRow = this.node.querySelector && this.node.querySelector('tr');
        const colCount = firstRow ? firstRow.children.length : 0;
        let tableWidth = '640px';
        if (colCount > 3) {
          tableWidth = `${colCount * 200}px`;
        }

        return { width: tableWidth };
      },

      renderTableContent() {
        const vm = this;
        return {
          functional: true,
          render() {
            return vm.mapChildren(vm.node.childNodes);
          },
        };
      },
    },
  };

</script>


<style scoped>

  .table-container {
    margin: 1em 0;
    overflow-x: auto;
  }

  caption.safe-html {
    padding: 2px 0 4px;
    font-weight: bold;
    text-align: center;
  }

</style>
