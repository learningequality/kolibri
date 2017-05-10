<template>

  <div>

    <breadcrumbs/>
    <h1 v-if="!isRootLearnerPage">
      <content-icon
        :kind="pageState.contentScopeSummary.kind"
        colorstyle="text-default"
      />
      {{ pageState.contentScopeSummary.title }}
    </h1>
    <report-subheading />

    <report-table>
      <thead slot="thead">
        <tr>
          <header-cell
            align="left"
            :text="$tr('name')"
            :column="TableColumns.NAME"
            :sortable="true"
          />
          <header-cell
            v-if="!isRootLearnerPage"
            :text="isExercisePage ? $tr('exerciseProgress') : $tr('contentProgress')"
            :column="isExercisePage ? TableColumns.EXERCISE : TableColumns.CONTENT"
            :sortable="true"
          />
          <header-cell
            align="left"
            :text="$tr('group')"
            :column="TableColumns.GROUP"
            :sortable="true"
          />
          <header-cell
            align="left"
            v-if="!isRootLearnerPage"
            :text="$tr('lastActivity')"
            :column="TableColumns.DATE"
            :sortable="true"
          />
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
            v-if="!isRootLearnerPage"
            :num="isExercisePage ? row.exerciseProgress : row.contentProgress"
            :isExercise="isExercisePage"
          />
          <td>{{ row.groupName || '–' }}</td>
          <activity-cell v-if="!isRootLearnerPage" :date="row.lastActive" />
        </tr>
      </tbody>
    </report-table>

  </div>

</template>


<script>

  const CoreConstants = require('kolibri.coreVue.vuex.constants');
  const CoachConstants = require('../../constants');
  const reportGetters = require('../../state/getters/reports');
  const ReportConstants = require('../../reportConstants');

  module.exports = {
    $trNameSpace: 'learnerReportPage',
    $trs: {
      name: 'Name',
      group: 'Group',
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
      'report-subheading': require('./report-subheading'),
      'header-cell': require('./table-cells/header-cell'),
      'name-cell': require('./table-cells/name-cell'),
      'progress-cell': require('./table-cells/progress-cell'),
      'activity-cell': require('./table-cells/activity-cell'),
    },
    computed: {
      isExercisePage() {
        return this.pageState.contentScopeSummary.kind === CoreConstants.ContentNodeKinds.EXERCISE;
      },
      isRootLearnerPage() {
        return this.pageName === CoachConstants.PageNames.LEARNER_LIST;
      },
      TableColumns() {
        return ReportConstants.TableColumns;
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
        } else if (this.isRootLearnerPage) {
          return {
            name: CoachConstants.PageNames.LEARNER_CHANNELS,
            params: {
              classId: this.classId,
              userId: row.id,
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
