<template>

  <div>

    <breadcrumbs/>
    <h1>{{ $tr('title') }}</h1>
    <sub v-if="standardDataTable.length">{{ $tr('subHeading') }}</sub>
    <sub v-else>{{ $tr('noRecentProgress') }}</sub>

    <report-table v-if="standardDataTable.length">
      <thead slot="thead">
        <tr>
          <header-cell
            :text="$tr('name')"
            align="left"
            :sortable="true"
            :column="tableColumns.NAME"/>
          <header-cell
            :text="$tr('progress')"
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
          <name-cell
            :kind="row.kind"
            :title="row.title"
            :link="genLink(row)"
          />
          <td>
            <progress-bar :show-percentage="false" :progress="row.contentProgress"/>
            {{ progressString(row) }}
          </td>
          <activity-cell :date="row.lastActive" />
        </tr>
      </tbody>
    </report-table>


  </div>

</template>


<script>

  const CoachConstants = require('../../constants');
  const reportConstants = require('../../reportConstants');
  const ContentNodeKinds = require('kolibri.coreVue.vuex.constants').ContentNodeKinds;
  const mainGetters = require('../../state/getters/main');
  const reportGetters = require('../../state/getters/reports');

  module.exports = {
    name: 'coachRecentReports',
    $trNameSpace: 'coachRecentReports',
    $trs: {
      title: 'Recent Activity',
      subHeading: 'Showing recent activity in past 7 days',
      name: 'Name',
      progress: 'Class progress',
      noRecentProgress: 'No recent activity in past 7 days',
      reportProgress: '{completed} {descriptor}',
      listened: '{proportionCompleted} listened',
      opened: '{proportionCompleted} opened',
      watched: '{proportionCompleted} watched',
      mastered: '{proportionCompleted} completed',
      lastActivity: 'Last activity',
    },
    components: {
      'breadcrumbs': require('./breadcrumbs'),
      'report-table': require('./report-table'),
      'header-cell': require('./table-cells/header-cell'),
      'name-cell': require('./table-cells/name-cell'),
      'activity-cell': require('./table-cells/activity-cell'),
      'content-icon': require('kolibri.coreVue.components.contentIcon'),
      'progress-bar': require('kolibri.coreVue.components.progressBar'),
    },
    computed: {
      tableColumns() {
        return reportConstants.TableColumns;
      },
    },
    methods: {
      progressString(row) {
        // string representation of a fraction, can't use completedProgress
        const proportionCompleted = `${row.logCountComplete}` +
          `/${this.userCount}`;
        switch (row.kind) {
          case ContentNodeKinds.AUDIO:
            return this.$tr('listened', { proportionCompleted });
          case ContentNodeKinds.DOCUMENT:
            return this.$tr('opened', { proportionCompleted });
          case ContentNodeKinds.VIDEO:
            return this.$tr('watched', { proportionCompleted });
          case ContentNodeKinds.EXERCISE:
            return this.$tr('mastered', { proportionCompleted });
          case ContentNodeKinds.HTML5:
            return this.$tr('mastered', { proportionCompleted });
          default:
            return this.$tr('mastered', { proportionCompleted });
        }
      },
      genLink(row) {
        return {
          name: CoachConstants.PageNames.RECENT_LEARNERS_FOR_ITEM,
          params: {
            classId: this.classId,
            channelId: this.pageState.channelId,
            contentId: row.id,
          }
        };
      },
    },
    vuex: {
      getters: {
        classId: state => state.classId,
        pageState: state => state.pageState,
        userCount: mainGetters.classMemberCount,
        standardDataTable: reportGetters.standardDataTable,
      },
    },
  };

</script>


<style lang="stylus" scoped></style>
