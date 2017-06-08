<template>

  <div>
    <h1>Textbox</h1>
    <h2>Source Code: kolibri/kolibri/core/assets/src/views/textbox/index.vue</h2> 
    <component-table class="component-table"></component-table>
    <documentation-component></documentation-component>
  </div>

</template>


<script>

  module.exports = {
    components: {
      'component-table': require('../component_table'),
      'documentation-component': require('../documentation_component'),
    }
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

</style>
