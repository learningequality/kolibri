<template>

  <div v-if="customStyles" class="loading-spinner"></div>

  <div v-else v-show="isVisible" class="loading-spinner-wrapper">
    <div class="loading-spinner loading-spinner-no-custom"></div>
  </div>

</template>


<script>

  export default {
    props: {
      delay: {
        type: Number,
        default: 2500,
      },
      customStyles: {
        type: Boolean,
        default: false,
      },
    },
    data: () => ({
      timeoutId: undefined,
      isVisible: false,
    }),
    methods: {
      show() {
        this.isVisible = true;
      },
    },
    mounted() {
      this.isVisible = false;
      this.timeoutId = window.setTimeout(this.show, this.delay);
    },
    destroyed() {
      window.clearTimeout(this.timeoutId);
    },
  };

</script>


<style lang="stylus" scoped>

  .loading-spinner
    width: 125px
    height: 125px
    background: url('loading-spinner.gif') no-repeat center
    background-size: contain

    &-wrapper
      width: 100%
      height: 100%
      position: relative

    &-no-custom
      position: absolute
      top: 50%
      left: 50%
      transform: translate(-50%, -50%)

</style>
