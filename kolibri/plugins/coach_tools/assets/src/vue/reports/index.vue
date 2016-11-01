<template>

  <div>
    <h1>Reports</h1>
    <breadcrumbs></breadcrumbs>
    <summary-section></summary-section>
  </div>

</template>


<script>

  module.exports = {
    components: {
      'breadcrumbs': require('./breadcrumbs'),
      'summary-section': require('./summary-section'),
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.coreTheme'

</style>
