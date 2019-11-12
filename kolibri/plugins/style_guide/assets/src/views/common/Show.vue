<template>

  <div class="show">
    <slot></slot>
  </div>

</template>


<script>

  export default {
    name: 'Show',
  };

</script>


<style lang="scss" scoped>

  .show {
    padding-right: 8px;
    padding-left: 8px;
    margin-right: -8px;
    margin-left: -8px;
    border: 1px solid #dedede;
    border-radius: 4px;
  }

</style>
