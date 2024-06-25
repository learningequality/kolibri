<template>

  <transition-group
    name="channel-list"
    tag="div"
  >
    <slot> </slot>
  </transition-group>

</template>


<script>

  export default {
    name: 'FadeInTransitionGroup',
  };

</script>


<style scoped>

  .channel-list-enter-active,
  .channel-list-leave-active,
  .channel-list-move {
    transition: opacity 0.25s ease;
  }

  .channel-list-enter,
  .channel-list-leave-to {
    opacity: 0;
  }

</style>
