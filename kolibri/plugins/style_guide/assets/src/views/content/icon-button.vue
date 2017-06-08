<template>

  <div>
    <h1>Icon Button</h1>
    <h2>Source Code: kolibri/kolibri/core/assets/src/views/icon-button/index.vue</h2> 
    <documentation-component :componentApi="api"></documentation-component>
  </div>

</template>


<script>

  var api = require('!vue-doc!kolibri.coreVue.components.iconButton'); // eslint-disable-line

  module.exports = {
    components: {
      'documentation-component': require('../documentation_component'),
    },
    data: () => ({
      api
    })
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  $table-width = 25em

  .table
    width: 100%  

</style>
