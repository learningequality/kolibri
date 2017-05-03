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
            align="left"
            :sortable="true"
            :column="tableColumns.NAME"/>
          <header-cell
            :text="$tr('avgExerciseProgress')"
            :sortable="true"
            :column="tableColumns.EXERCISE"/>
          <header-cell
            :text="$tr('avgContentProgress')"
            :sortable="true"
            :column="tableColumns.CONTENT"/>
          <header-cell
            :text="$tr('lastActivity')"
            align="left"
            :sortable="true"
            :column="tableColumns.DATE"/>
        </tr>
      </thead>
      <tbody slot="tbody">
        <tr v-for="row in standardDataTable" :key="row.id">
          <name-cell :kind="row.kind" :title="row.title" :link="genRowLink(row)">
            {{ $tr('exerciseCountText', {count: row.exerciseCount}) }}
            •
            {{ $tr('contentCountText', {count: row.contentCount}) }}
          </name-cell>
          <progress-cell :num="row.exerciseProgress" :isExercise="true"/>
          <progress-cell :num="row.contentProgress" :isExercise="false"/>
          <activity-cell :date="row.lastActive" />
        </tr>
      </tbody>
    </report-table>

  </div>

</template>


<script>

  const CoachConstants = require('../../constants');
  const CoreConstants = require('kolibri.coreVue.vuex.constants');
  const reportGetters = require('../../state/getters/reports');
  const reportConstants = require('../../reportConstants');

  module.exports = {
    $trNameSpace: 'itemReportPage',
    $trs: {
      name: 'Name',
      avgExerciseProgress: 'Avg. exercise progress',
      avgContentProgress: 'Avg. resource progress',
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
    methods: {
      genRowLink(row) {
        if (row.kind === CoreConstants.ContentNodeKinds.TOPIC) {
          return {
            name: CoachConstants.PageNames.TOPIC_ITEM_LIST,
            params: {
              classId: this.classId,
              channelId: this.pageState.channelId,
              topicId: row.id,
            }
          };
        }
        return {
          name: CoachConstants.PageNames.TOPIC_LEARNERS_FOR_ITEM,
          params: {
            classId: this.classId,
            channelId: this.pageState.channelId,
            contentId: row.id,
          }
        };
      },
    },
    computed: {
      tableColumns() {
        return reportConstants.TableColumns;
      },
    },
    vuex: {
      getters: {
        classId: state => state.classId,
        pageState: state => state.pageState,
        exerciseCount: reportGetters.exerciseCount,
        contentCount: reportGetters.contentCount,
        standardDataTable: reportGetters.standardDataTable,
      },
    },
  };

</script>


<style lang="stylus" scoped></style>
