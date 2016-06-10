<template>
  <template v-for="(title,block) in content">
    <rec-block :title="title" :block="block"></rec-block>
  </template>
</template>

<script>

  const content = require('./demo/content_recommendation_data.json');
  module.exports = {
    components: {
      'rec-block': require('./rec-block'),
    },
    data: () => ({
      content,
    }),
  };
</script>

<style lang="stylus" scoped>

  @require '~core-theme.styl'

</style>
