<template>

  <div>
    <template v-if="pageName === recent && !standardDataTable.length">
      {{ $tr('noRecentProgress', { threshold }) }}
    </template>
    <template v-if="pageName === exam && !exams.length ">
      {{ $tr('noExams') }}
    </template>
    <template v-if="pageName === general && standardDataTable.length">
      {{ $tr('subHeading' , { threshold }) }}
    </template>
    <template v-if="pageName === learners && !standardDataTable.length">
      {{ $tr('noLearners') }}
    </template>
    <template v-if="pageName === groups && !group.users.length">
      {{ $tr('noGroups') }}
    </template>
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
    props: {
      group: {
        type: Object,
        required: true,
        validator(group) {
          return group.name && group.users;
        },
      },
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
