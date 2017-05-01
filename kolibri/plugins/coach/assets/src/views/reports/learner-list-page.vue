<template>

  <div>

    <breadcrumbs/>
    <h1>
      <content-icon
        :kind="pageState.contentScopeSummary.kind"
        colorstyle="text-default"
      />
      {{ pageState.contentScopeSummary.title }}
    </h1>

    <report-table>
      <thead slot="thead">
        <tr>
          <header-cell :text="$tr('name')" align="left"/>
          <header-cell :text="isExercisePage ? $tr('exerciseProgress') : $tr('contentProgress')"/>
          <header-cell :text="$tr('lastActivity')" align="left"/>
        </tr>
      </thead>
      <tbody slot="tbody">
        <tr v-for="row in standardDataTable" :key="row.id">
          <name-cell
            :kind="row.kind"
            :title="row.title"
            :link="genLink(row)"
          />
          <progress-cell
            :num="isExercisePage ? row.exerciseProgress : row.contentProgress"
            :isExercise="isExercisePage"
          />
          <activity-cell :date="row.lastActive" />
        </tr>
      </tbody>
    </report-table>

  </div>

</template>


<script>

  const CoreConstants = require('kolibri.coreVue.vuex.constants');
  const CoachConstants = require('../../constants');
  const reportGetters = require('../../state/getters/reports');

  module.exports = {
    $trNameSpace: 'learnerReportPage',
    $trs: {
      name: 'Name',
      exerciseProgress: 'Exercise progress',
      contentProgress: 'Resource progress',
      lastActivity: 'Last activity',
      exerciseCountText: '{count, number, integer} {count, plural, one {Exercise} other {Exercises}}',
      contentCountText: '{count, number, integer} {count, plural, one {Resource} other {Resources}}',
    },
    components: {
      'content-icon': require('kolibri.coreVue.components.contentIcon'),
      'breadcrumbs': require('./breadcrumbs'),
      'report-table': require('./report-table'),
      'header-cell': require('./table-cells/header-cell'),
      'name-cell': require('./table-cells/name-cell'),
      'progress-cell': require('./table-cells/progress-cell'),
      'activity-cell': require('./table-cells/activity-cell'),
    },
    computed: {
      isExercisePage() {
        return this.pageState.contentScopeSummary.kind === CoreConstants.ContentNodeKinds.EXERCISE;
      },
    },
    methods: {
      genLink(row) {
        if (this.isExercisePage) {
          const targetName = this.pageName === CoachConstants.PageNames.RECENT_LEARNERS_FOR_ITEM ?
            CoachConstants.PageNames.RECENT_LEARNER_ITEM_DETAILS_ROOT :
            CoachConstants.PageNames.TOPIC_LEARNER_ITEM_DETAILS_ROOT;
          return {
            name: targetName,
            params: {
              classId: this.classId,
              userId: row.id,
              channelId: this.pageState.channelId,
              contentId: this.pageState.contentScopeSummary.contentId,
            }
          };
        }
        return undefined;
      },
    },
    vuex: {
      getters: {
        classId: state => state.classId,
        pageState: state => state.pageState,
        pageName: state => state.pageName,
        exerciseCount: reportGetters.exerciseCount,
        contentCount: reportGetters.contentCount,
        standardDataTable: reportGetters.standardDataTable,
      },
    },
  };

</script>


<style lang="stylus" scoped></style>
