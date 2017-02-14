<template>

  <div>
    <ui-toolbar
      :title="title"
      type="colored"
      textColor="white"
      class="app-bar">
    </ui-toolbar>
  </div>

</template>


<script>

  module.exports = {
    props: {
      title: {
        type: String,
        required: true,
      },
    },
    components: {
      'ui-toolbar': require('keen-ui/src/UiToolbar'),
    },
  };

</script>


<style lang="stylus" scoped>

  .app-bar
    z-index: 1000

</style>
