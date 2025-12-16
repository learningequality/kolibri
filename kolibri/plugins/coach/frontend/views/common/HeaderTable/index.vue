<template>

  <table>
    <slot></slot>
  </table>

</template>


<script>

  export default {
    name: 'HeaderTable',
  };

</script>


<style lang="scss" scoped>

  table {
    min-width: 200px;
  }

</style>
