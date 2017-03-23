<template>

  <div id="recent">
    <report-list v-if="pageState.channel_id" :reports="pageState.reports" />
    <channel-list v-else />
  </div>

</template>


<script>

  module.exports = {
    components: {
      'channel-list': require('./channel-list'),
      'report-list': require('./report-list'),
    },
    vuex: {
      getters: {
        pageState: state => state.pageState,
      },
    },
  };

</script>


<style lang="stylus" scoped></style>
