<template>

  <div>
    <h1>{{ $tr('errorHeader') }}</h1>
    <p>{{ $tr('errorPrefixText') }}</p>
    <textarea>
      {{ error }}
    </textarea>
  </div>

</template>


<script>

  module.exports = {
    $trNameSpace: 'error',
    $trs: {
      errorHeader: 'Error',
      errorPrefixText: 'We\'ve encountered an issue:',
    },
    vuex: {
      getters: {
        error: state => state.core.error,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  textarea
    width: 100%
    height: 300px
    font-family: monospace
    font-size: 10px

</style>
