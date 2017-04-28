<template>

  <div>

    <breadcrumbs/>
    <h1>{{ $tr('title') }}</h1>
    <sub>{{ $tr('subHeading') }}</sub>

    <report-table v-if="pageState.reports.length">
      <thead slot="thead">
        <tr>
          <header-cell :text="$tr('name')" align="left"/>
          <header-cell :text="$tr('progress')"/>
          <header-cell :text="$tr('lastActivity')" align="left"/>
        </tr>
      </thead>
      <tbody slot="tbody">
        <tr v-for="row in itemList" :key="row.id">
          <name-cell
            :kind="row.kind"
            :title="row.title"
            :link="genLink(row)"
          />
          <td>
            <progress-bar :show-percentage="false" :progress="completedProgress(row.progress[0])"/>
            {{ progressString(row) }}
          </td>
          <activity-cell :date="row.lastActive" />
        </tr>
      </tbody>
    </report-table>
    <div v-else>
      {{ $tr('noRecentProgress') }}
    </div>

  </div>

</template>


<script>

  const CoachConstants = require('../../constants');
  const ContentNodeKinds = require('kolibri.coreVue.vuex.constants').ContentNodeKinds;

  module.exports = {
    name: 'coachRecentReports',
    $trNameSpace: 'coachRecentReports',
    $trs: {
      title: 'Recent Activity',
      subHeading: 'Showing recent activity in past 7 days',
      name: 'Name',
      progress: 'Progress',
      noRecentProgress: 'No recent progress',
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
      itemList() {
        return Array.from(this.pageState.reports).sort(
          (report1, report2) => new Date(report2.lastActive) - new Date(report1.lastActive)
        );
      },
    },
    methods: {
      completedProgress(progress) {
        return progress.logCountComplete / progress.logCountTotal;
      },
      progressString(row) {
        // string representation of a fraction, can't use completedProgress
        const proportionCompleted = `${row.progress[0].logCountComplete}` +
          `/${row.progress[0].logCountTotal}`;
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
      },
    },
  };

</script>


<style lang="stylus" scoped></style>
