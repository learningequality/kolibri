<template>
  <div>
    <sub v-if="pageName == recent && !standardDataTable.length">{{ $tr('noRecentProgress', { threshold }) }}</sub>
    <sub v-if="pageName == exam && !exams.length ">{{ $tr('noExams') }}</sub>
    <sub v-if="pageName == general && standardDataTable.length">{{ $tr('subHeading' , { threshold }) }}</sub>
    <sub v-if="pageName == learners && !standardDataTable.length">{{ $tr('noLearners') }}</sub>
    <sub v-if="pageName == groups">{{ $tr('noGroups') }}</sub>
  </div>
</template>


<script>

  import * as ReportConstants from '../../reportConstants';
  import * as reportGetters from '../../state/getters/reports';
  import { PageNames } from '../../constants';

  export default {
    name: 'coachReportSubheading',
    $trs: {
      noRecentProgress: 'No activity in past {threshold} days',
      noExams: 'You do not have any exams. Start by creating a new exam below',
      noLearners: 'You do not have any learners registered yet',
      noGroups: 'You do not have any groups created yet. Start by creating a new one below',
      subHeading: 'Only showing activity in past {threshold} days',
    },
    data: () => ({
      recent: PageNames.RECENT_CHANNELS,
      exam: PageNames.EXAMS,
      learners: PageNames.LEARNER_LIST,
      groups: PageNames.GROUPS,
      general: PageNames.TOPIC_CHANNELS,
    }),
    computed: {
      threshold() {
        return ReportConstants.RECENCY_THRESHOLD_IN_DAYS;
      },
    },
    vuex: {
      getters: {
        standardDataTable: reportGetters.standardDataTable,
        pageName: state => state.pageName,
        exams: state => state.pageState.exams,
      },
    },
  };

</script>

<style lang="stylus" scoped></style>
