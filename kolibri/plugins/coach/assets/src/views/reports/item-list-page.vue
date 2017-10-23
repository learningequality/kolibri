<template>

  <div>

    <breadcrumbs />
    <h1>
      <content-icon
        :kind="pageState.contentScopeSummary.kind"
        colorstyle="text-default"
      />
      {{ pageState.contentScopeSummary.title }}
    </h1>
    <div>
      <ul>
        <li>{{ $tr('exerciseCountText', {count: exerciseCount}) }}</li>
        <li>{{ $tr('contentCountText', {count: contentCount}) }}</li>
      </ul>
    </div>

    <report-table>
      <thead slot="thead">
        <tr>
          <header-cell
            :text="$tr('name')"
            :align="alignStart"
            :sortable="true"
            :column="tableColumns.NAME" />
          <header-cell
            :text="$tr('avgExerciseProgress')"
            :sortable="true"
            :column="tableColumns.EXERCISE" />
          <header-cell
            :text="$tr('avgContentProgress')"
            :sortable="true"
            :column="tableColumns.CONTENT" />
          <header-cell
            :text="$tr('lastActivity')"
            :align="alignStart"
            :sortable="true"
            :column="tableColumns.DATE" />
        </tr>
      </thead>
      <tbody slot="tbody">
        <tr v-for="row in standardDataTable" :key="row.id">
          <name-cell :kind="row.kind" :title="row.title" :link="genRowLink(row)">
            {{ $tr('exerciseCountText', {count: row.exerciseCount}) }}
            •
            {{ $tr('contentCountText', {count: row.contentCount}) }}
          </name-cell>
          <progress-cell :num="row.exerciseProgress" :isExercise="true" />
          <progress-cell :num="row.contentProgress" :isExercise="false" />
          <activity-cell :date="row.lastActive" />
        </tr>
      </tbody>
    </report-table>

  </div>

</template>


<script>

  import * as CoachConstants from '../../constants';
  import * as CoreConstants from 'kolibri.coreVue.vuex.constants';
  import * as reportGetters from '../../state/getters/reports';
  import * as reportConstants from '../../reportConstants';
  import contentIcon from 'kolibri.coreVue.components.contentIcon';
  import breadcrumbs from './breadcrumbs';
  import reportTable from './report-table';
  import headerCell from './table-cells/header-cell';
  import nameCell from './table-cells/name-cell';
  import progressCell from './table-cells/progress-cell';
  import activityCell from './table-cells/activity-cell';

  import alignMixin from './align-mixin';

  export default {
    name: 'itemReportPage',
    components: {
      contentIcon,
      breadcrumbs,
      reportTable,
      headerCell,
      nameCell,
      progressCell,
      activityCell,
    },
    mixins: [alignMixin],
    $trs: {
      name: 'Name',
      avgExerciseProgress: 'Avg. exercise progress',
      avgContentProgress: 'Avg. resource progress',
      lastActivity: 'Last activity',
      exerciseCountText: '{count, number, integer} {count, plural, one {Exercise} other {Exercises}}',
      contentCountText: '{count, number, integer} {count, plural, one {Resource} other {Resources}}',
    },
    computed: {
      tableColumns() {
        return reportConstants.TableColumns;
      },
    },
    methods: {
      genRowLink(row) {
        if (CoachConstants.TopicReports.includes(this.pageName)) {
          if (row.kind === CoreConstants.ContentNodeKinds.TOPIC) {
            return {
              name: CoachConstants.PageNames.TOPIC_ITEM_LIST,
              params: {
                classId: this.classId,
                channelId: this.pageState.channelId,
                topicId: row.id,
              },
            };
          }
          return {
            name: CoachConstants.PageNames.TOPIC_LEARNERS_FOR_ITEM,
            params: {
              classId: this.classId,
              channelId: this.pageState.channelId,
              contentId: row.id,
            },
          };
        } else if (CoachConstants.LearnerReports.includes(this.pageName)) {
          if (row.kind === CoreConstants.ContentNodeKinds.TOPIC) {
            return {
              name: CoachConstants.PageNames.LEARNER_ITEM_LIST,
              params: {
                classId: this.classId,
                channelId: this.pageState.channelId,
                topicId: row.id,
              },
            };
          } else if (row.kind === CoreConstants.ContentNodeKinds.EXERCISE) {
            return {
              name: CoachConstants.PageNames.LEARNER_ITEM_DETAILS_ROOT,
              params: {
                classId: this.classId,
                channelId: this.pageState.channelId,
                contentId: row.id,
              },
            };
          }
        }
        return null;
      },
    },
    vuex: {
      getters: {
        classId: state => state.classId,
        pageName: state => state.pageName,
        pageState: state => state.pageState,
        exerciseCount: reportGetters.exerciseCount,
        contentCount: reportGetters.contentCount,
        standardDataTable: reportGetters.standardDataTable,
      },
    },
  };

</script>


<style lang="stylus" scoped></style>
