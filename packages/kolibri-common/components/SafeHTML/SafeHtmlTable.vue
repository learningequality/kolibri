<template>

  <div class="table-container">
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

        if (colCount <= 3) {
          return { width: '640px' };
        }

        return { width: `${colCount * 200}px` };
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
