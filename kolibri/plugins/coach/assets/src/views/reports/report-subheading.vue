<template>

  <div v-if="showRecentOnly">
    <sub v-if="standardDataTable.length">{{ $tr('subHeading', { threshold }) }}</sub>
    <sub v-else>{{ $tr('noRecentProgress', { threshold }) }}</sub>
  </div>

</template>


<script>

  import * as ReportConstants from '../../reportConstants';
  import * as reportGetters from '../../state/getters/reports';

  export default {
    name: 'coachReportSubheading',
    $trs: {
      subHeading: 'Only showing activity in past {threshold} days',
      noRecentProgress: 'No activity in past {threshold} days',
    },
    computed: {
      threshold() {
        return ReportConstants.RECENCY_THRESHOLD_IN_DAYS;
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
