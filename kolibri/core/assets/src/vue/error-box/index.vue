<template>

  <div class="error-box-wrapper" :class="{ hidden: isHidden }">
    <button class="close-button" @click="hideErrorbox" :aria-label="$tr('errorButtonLabel')">
      <svg src="../icons/close.svg" role="presentation"></svg>
    </button>
    <h1>{{ $tr('errorHeader') }}</h1>
    <p>{{ $tr('explanation') }}</p>
    <label for="error-textbox" aria-live="polite">{{ $tr('errorLabel') }}</label><br>
    <div id="error-textbox">
      {{ error }}
    </div>
  </div>

</template>


<script>

  module.exports = {
    $trNameSpace: 'error',
    $trs: {
      errorHeader: 'Error',
      errorButtonLabel: 'Hide Error',
      explanation: `Sorry, we've encountered an issue. You may need to refresh the page or click one of the main navigation links.`,
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

  .error-box-wrapper
    padding: 10px
    margin-top: 50px
    position: relative
    background-color: #FFF6F6
    border: 2px solid #e0b4b4
    color: #9F3A38

  .hidden
    display: none

  .close-button
    position: absolute
    right: 5px
    top: 5px
    border: none

  #error-textbox
    max-height: 300px
    padding: 5px
    margin-top: 10px
    overflow: auto
    font-family: monospace
    font-size: 10px
    border: 1px solid black
    background-color: white
    color: black

</style>
