<template>

  <span class="wrapper">
    <slot></slot>

    <transition name="fade">
      <span :key="label" class="label">{{ label }}</span>
    </transition>
  </span>

</template>


<script>

  export default {
    name: 'LabeledIcon',
    components: {},
    props: {
      label: {
        type: [String, Number],
        required: true,
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri.styles.definitions';

  .wrapper {
    position: relative;
    white-space: nowrap;
  }

  .label {
    margin-left: 6px;
  }

  .wrapper svg {
    position: relative;
    top: -1px;
    width: 16px;
    vertical-align: middle;
  }

  .fade-leave-active {
    position: absolute;
  }

  .fade-enter-active,
  .fade-leave-active {
    transition: opacity $core-time ease;
  }
  .fade-enter, .fade-leave-to /* .fade-leave-active below version 2.1.8 */ {
    opacity: 0;
  }

</style>
