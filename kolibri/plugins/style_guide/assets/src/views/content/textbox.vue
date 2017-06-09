<template>

  <div>
    <h1>Textbox</h1>
    <api-table :api="api"></api-table>
  </div>

</template>


<script>

  var api = require('!vue-doc!kolibri.coreVue.components.textbox'); // eslint-disable-line

  module.exports = {
    components: {
      'api-table': require('../api_table'),
    },
    data: () => ({
      api
    })
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

</style>
