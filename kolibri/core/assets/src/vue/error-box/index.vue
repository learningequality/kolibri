<template>

  <div>
    <h2>Whoops!</h2>
    <p>We've encountered an issue:</p>
    <textarea>
      {{ error }}
    </textarea>
  </div>

</template>


<script>

  module.exports = {
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
