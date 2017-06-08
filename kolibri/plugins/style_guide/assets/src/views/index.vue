<template>

  <div>

    <h1>Style Guide</h1>
    
    <h2>Dropdown Menu</h2>
    <h3>Path to file: kolibri/kolibri/core/assets/src/views/dropdown-menu/index.vue</h3>
    <component-table class="component-table"></component-table>
    <documentation-component></documentation-component>

  </div>

</template>


<script>

  module.exports = {
    components: {
      'component-table': require('./component_table'),
      'documentation-component': require('./documentation_component'),
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  $component-table-width = 25em

  .component-table
    width: 100%

</style>
