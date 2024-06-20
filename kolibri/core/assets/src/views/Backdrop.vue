<template>

  <transition
    name="backdrop"
    appear
  >
    <div
      class="backdrop"
      :class="{ 'has-transitions': transitions }"
      @click="$emit('click')"
    >
      <slot></slot>
    </div>
  </transition>

</template>


<script>

  export default {
    name: 'Backdrop',
    props: {
      transitions: {
        // If true, backdrop will have enter/leave transitions
        type: Boolean,
        default: false,
      },
    },
  };

</script>


<style lang="scss" scoped>

  .backdrop {
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    // Overlays everything except the sidepanel and KModals
    z-index: 11;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.7);
    background-attachment: fixed;
  }

  .has-transitions.backdrop-enter {
    opacity: 0;
  }

  .has-transitions.backdrop-enter-to {
    opacity: 1;
  }

  .has-transitions.backdrop-enter-active {
    transition: opacity 0.2s ease-in-out;
  }

  .has-transitions.backdrop-leave {
    opacity: 1;
  }

  .has-transitions.backdrop-leave-to {
    opacity: 0;
  }

  .has-transitions.backdrop-leave-active {
    transition: opacity 0.2s ease-in-out;
  }

</style>
