<template>

  <div class="error-box-wrapper">
    Hello world
  </div>

</template>


<script>

  export default {
    name: 'error',
    $trs: {
      errorHeader: 'Error',
      errorButtonLabel: 'Hide error',
      explanation: `Sorry, something went wrong. Please try refreshing the page`,
      errorLabel: `Error details:`,
    },
    vuex: {
      getters: {
        error: state => state.core.error,
      },
    },
    data: () => ({
      isHidden: false,
    }),
    methods: {
      hideErrorbox() {
        this.isHidden = true;
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  .error-box-wrapper
    padding: 10px
    margin-top: 50px
    position: relative
    background-color: $core-bg-error
    border: 1px solid $core-text-error
    color: $core-text-error

  .hidden
    display: none

  .close-button
    position: absolute
    right: 5px
    top: 5px
    border: none

  .error-box
    max-height: 300px
    padding: 5px
    margin-top: 10px
    overflow: auto
    font-family: monospace
    font-size: 10px
    border: 1px solid black
    background-color: white
    color: $core-text-default

</style>
