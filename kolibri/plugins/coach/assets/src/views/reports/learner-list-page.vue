<template>

  <div>

    <breadcrumbs />
    <h1 v-if="!isRootLearnerPage">
      <content-icon
        :kind="pageState.contentScopeSummary.kind"
        colorstyle="text-default"
      />
      {{ pageState.contentScopeSummary.title }}
    </h1>
    <report-subheading />
    <p v-if="!standardDataTable.length" class="center-text"><strong>{{ $tr('noLearners') }}</strong></p>
    <report-table v-else>
      <thead slot="thead">
        <tr>
          <header-cell
            :align="alignStart"
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
            :align="alignStart"
            :text="$tr('group')"
            :column="TableColumns.GROUP"
            :sortable="true"
          />
          <header-cell
            :align="alignStart"
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

  import * as CoreConstants from 'kolibri.coreVue.vuex.constants';
  import * as CoachConstants from '../../constants';
  import * as reportGetters from '../../state/getters/reports';
  import * as ReportConstants from '../../reportConstants';
  import contentIcon from 'kolibri.coreVue.components.contentIcon';
  import breadcrumbs from './breadcrumbs';
  import reportTable from './report-table';
  import reportSubheading from './report-subheading';
  import headerCell from './table-cells/header-cell';
  import nameCell from './table-cells/name-cell';
  import progressCell from './table-cells/progress-cell';
  import activityCell from './table-cells/activity-cell';

  import alignMixin from './align-mixin';

  export default {
    name: 'learnerReportPage',
    components: {
      contentIcon,
      breadcrumbs,
      reportTable,
      reportSubheading,
      headerCell,
      nameCell,
      progressCell,
      activityCell,
    },
    mixins: [alignMixin],
    $trs: {
      name: 'Name',
      group: 'Group',
      exerciseProgress: 'Exercise progress',
      contentProgress: 'Resource progress',
      lastActivity: 'Last activity',
      exerciseCountText: '{count, number, integer} {count, plural, one {Exercise} other {Exercises}}',
      contentCountText: '{count, number, integer} {count, plural, one {Resource} other {Resources}}',
      noLearners: 'You do not have any learners registered yet',
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
          const targetName =
            this.pageName === CoachConstants.PageNames.RECENT_LEARNERS_FOR_ITEM
              ? CoachConstants.PageNames.RECENT_LEARNER_ITEM_DETAILS_ROOT
              : CoachConstants.PageNames.TOPIC_LEARNER_ITEM_DETAILS_ROOT;
          return {
            name: targetName,
            params: {
              classId: this.classId,
              userId: row.id,
              channelId: this.pageState.channelId,
              contentId: this.pageState.contentScopeSummary.id,
            },
          };
        } else if (this.isRootLearnerPage) {
          return {
            name: CoachConstants.PageNames.LEARNER_CHANNELS,
            params: {
              classId: this.classId,
              userId: row.id,
            },
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
