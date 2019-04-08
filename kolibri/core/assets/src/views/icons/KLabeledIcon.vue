<template>

  <span class="labeled-icon-wrapper">
    <div class="icon">
      <slot name="icon"></slot>
    </div>
    <div class="label" dir="auto">
      <slot></slot>
    </div>
  </span>

</template>


<script>

  export default {
    name: 'KLabeledIcon',
    components: {},
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri.styles.definitions';

  .labeled-icon-wrapper {
    position: relative;
    display: inline-block;
  }

  .icon {
    position: absolute;
    left: 0;
  }

  .label {
    display: block;
    margin-left: 1.925em;
  }

  .label svg {
    // if you see this, you need to pass the icon into the slot
    border: 1px solid red;
  }

</style>
