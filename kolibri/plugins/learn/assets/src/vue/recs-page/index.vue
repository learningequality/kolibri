<template>

  <template v-for="(title,block) in content">
    <rec-section :title="title" :block="block"></rec-section>
  </template>

</template>


<script>

  const content = require('../../demo/content_recommendation_data.json');
  module.exports = {
    components: {
      'rec-section': require('./rec-section'),
    },
    data: () => ({
      content,
    }),
  };

</script>


<style lang="stylus" scoped>

  @require '~core-theme.styl'

</style>
