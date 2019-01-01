<template>

  <div class="bottom">
    <div class="inner-bottom">
      <slot></slot>
    </div>
  </div>

</template>


<script>

  export default {
    name: 'Bottom',
  };

</script>


<style lang="scss" scoped>

  .bottom {
    position: fixed;
    right: 0;
    bottom: 0;
    left: 0;
    z-index: 8; // material - Bottom app bar
    height: 72px;
    padding: 8px 16px;
    margin: 0;
    overflow-x: hidden;
    font-size: 14px;
    text-align: right;
    background-color: white;
    box-shadow: 0 8px 10px -5px rgba(0, 0, 0, 0.2), 0 16px 24px 2px rgba(0, 0, 0, 0.14),
      0 6px 30px 5px rgba(0, 0, 0, 0.12);
  }

  .inner-bottom {
    max-width: 960px;
    margin: auto;
  }


</style>
