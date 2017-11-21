<template>
  <div>
    <sub v-if="pageName == recent && !standardDataTable.length">{{ $tr('noRecentProgress', { threshold }) }}</sub>
    <sub v-if="pageName == exam && !exams.length ">{{ $tr('noExams') }}</sub>
    <sub v-if="pageName == general && standardDataTable.length">{{ $tr('subHeading' , { threshold }) }}</sub>
    <sub v-if="pageName == learners && !standardDataTable.length">{{ $tr('noLearners') }}</sub>
    <sub v-if="pageName == groups">{{ $tr('noGroups') }}</sub>
    <!-- <sub v-if="pageName == groups && !group.users.length">{{ $tr('noGroups') }}</sub> TOASK how to obtain the prop  -->
  </div>
</template>


<script>

  import * as ReportConstants from '../../reportConstants';
  import * as reportGetters from '../../state/getters/reports';
  // import {pageNames} from '../../constants';

  export default {
    name: 'coachReportSubheading',
    $trs: {
      noRecentProgress: 'No activity in past {threshold} days', //missing translation too ad manually to /kolibri/locale/es_ES/LC_FRONTEND_MESSAGES/coach_module-messages.json ?
      noExams: 'You do not have any exams. Start by creating a new exam above',
      noLearners: 'You do not have any learners registered yet',
      noGroups: 'You do not have any groups created yet',
      subHeading: 'Only showing activity in past {threshold} days',
    },
    props: ['group'],
    data: () => ({
      // recent: pageNames.RECENT_CHANNELS, TOASK how to include the constants /src/constants.js
      recent: 'RECENT_CHANNELS',
      exam: 'EXAMS',
      learners: 'LEARNER_LIST',
      groups: 'GROUPS',
      general: 'TOPIC_CHANNELS',
    }),
    computed: {
      threshold() {
        return ReportConstants.RECENCY_THRESHOLD_IN_DAYS;
      },
      // recent(){ //TOASK as a methof for including the constants = not working
      //   return pageNames.RECENT_CHANNELS;
      // }
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
