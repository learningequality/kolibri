<template>

  <div>
    <h1>Reports</h1>
    <breadcrumbs :list="ancestors"></breadcrumbs>
    <summary-section></summary-section>
  </div>

</template>


<script>

  module.exports = {

    components: {
      'breadcrumbs': require('./breadcrumbs'),
      'summary-section': require('./summary-section'),
    },

    data: () => ({
      ancestors: [
        {name: 'ALL Learners', 'id': '123'},
        {name: 'Aaron Dude'},
      ],
    }),

  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.coreTheme'

</style>
