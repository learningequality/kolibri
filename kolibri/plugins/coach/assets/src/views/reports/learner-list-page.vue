<template>

  <div>

    <breadcrumbs :list="contentBreadcrumbs"/>
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
          <name-cell :kind="row.kind" :title="row.title"/>
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
      contentBreadcrumbs() {
        return [
          // link to the root channels page
          {
            title: 'Channels',
            vlink: {
              name: CoachConstants.PageNames.TOPIC_CHANNELS,
              params: {
                classId: this.pageState.classId,
              },
            },
          },
          // links to each ancestor
          ...this.pageState.contentScopeSummary.ancestors.map((item, index) => {
            const breadcrumb = { title: item.title };
            if (index) {
              // links to parent topics
              breadcrumb.vlink = {
                name: CoachConstants.PageNames.TOPIC_ITEM_LIST,
                params: {
                  classId: this.pageState.classId,
                  channelId: this.pageState.channelId,
                  topicId: item.id,
                },
              };
            } else {
              // link to channel root
              breadcrumb.vlink = {
                name: CoachConstants.PageNames.TOPIC_CHANNEL_ROOT,
                params: {
                  classId: this.pageState.classId,
                  channelId: this.pageState.channelId,
                },
              };
            }
            return breadcrumb;
          }),
          // current item
          { title: this.pageState.contentScopeSummary.title }
        ];
      },
      isExercisePage() {
        return this.pageState.contentScopeSummary.kind === CoreConstants.ContentNodeKinds.EXERCISE;
      },
    },
    vuex: {
      getters: {
        pageState: state => state.pageState,
        exerciseCount: reportGetters.exerciseCount,
        contentCount: reportGetters.contentCount,
        standardDataTable: reportGetters.standardDataTable,
      },
    },
  };

</script>


<style lang="stylus" scoped></style>
