<template>

  <div>
    <work-in-progress />
    <!--
    <h1>{{ $tr('title') }}</h1>
    <div v-if="pageState.channelId">
      <report-list :reports="pageState.reports" />
    </div>
    <div v-else>
      <channel-list />
    </div>
    -->
  </div>

</template>


<script>

  module.exports = {
    $trNameSpace: 'coachRecentPage',
    $trs: {
      title: 'Recent Activity',
    },
    components: {
      'channel-list': require('./channel-list'),
      'report-list': require('./report-list'),
      'work-in-progress': require('../work-in-progress'),
    },
    vuex: {
      getters: {
        pageState: state => state.pageState,
      },
    },
  };

</script>


<style lang="stylus" scoped></style>
