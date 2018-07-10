<template>

  <div class="show-wrapper">
    <slot></slot>
  </div>

</template>


<script>

  export default {
    name: 'show',
  };

</script>


<style lang="scss" scoped>

  .show-wrapper {
    border: 1px solid #eee;
    padding: 8px;
  }

</style>
