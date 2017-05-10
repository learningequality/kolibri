<template>

  <div v-if="showRecentOnly">
    <sub v-if="standardDataTable.length">{{ $tr('subHeading', { threshold }) }}</sub>
    <sub v-else>{{ $tr('noRecentProgress', { threshold }) }}</sub>
  </div>

</template>


<script>

  const ReportConstants = require('../../reportConstants');
  const reportGetters = require('../../state/getters/reports');

  module.exports = {
    $trNameSpace: 'coachReportSubheading',
    $trs: {
      subHeading: 'Only showing activity in past {threshold} days',
      noRecentProgress: 'No activity in past {threshold} days',
    },
    computed: {
      threshold() {
        return ReportConstants.RECENCY_THREHOLD_IN_DAYS;
      },
    },
    vuex: {
      getters: {
        standardDataTable: reportGetters.standardDataTable,
        showRecentOnly: state => state.pageState.showRecentOnly,
      },
    },
  };

</script>


<style lang="stylus" scoped></style>
