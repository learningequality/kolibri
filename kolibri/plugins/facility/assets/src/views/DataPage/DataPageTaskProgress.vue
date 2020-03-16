<template>

  <div class="progress-wrapper">
    <KCircularLoader
      class="loader"
      :size="24"
    />
    <span class="message">
      <slot></slot>
    </span>
  </div>

</template>


<script>

  export default {
    name: 'DataPageTaskProgress',
  };

</script>


<style lang="scss" scoped>

  .progress-wrapper {
    position: relative;
    display: inline-block;
  }

  .loader {
    position: absolute;
    top: -2px;
    display: inline-block;
  }

  .message {
    margin-left: 30px;
  }

</style>
