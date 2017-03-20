<template>

  <div class="error-box-wrapper" :class="{ hidden: isHidden }">
    <button class="close-button" @click="hideErrorbox" :aria-label="$tr('errorButtonLabel')">
      <mat-svg category="navigation" name="close"/>
    </button>
    <h1>{{ $tr('errorHeader') }}</h1>
    <p>{{ $tr('explanation') }}</p>
    <label for="error-box" aria-live="polite">{{ $tr('errorLabel') }}</label><br>
    <div id="error-box" class="error-box">
      {{ error }}
    </div>
  </div>

</template>


<script>

  module.exports = {
    $trNameSpace: 'error',
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
    position: relative
    margin-top: 50px
    padding: 10px
    border: 1px solid $core-text-error
    background-color: $core-bg-error
    color: $core-text-error

  .hidden
    display: none

  .close-button
    position: absolute
    top: 5px
    right: 5px
    border: none

  .error-box
    overflow: auto
    margin-top: 10px
    padding: 5px
    max-height: 300px
    border: 1px solid black
    background-color: white
    color: black
    font-size: 10px
    font-family: monospace

</style>
