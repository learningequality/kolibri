<template>

  <div>
    <div v-if="reports.length" class="table-wrapper">
      <table class="report-list">
        <thead>
          <tr>
            <th>{{ $tr('name') }}</th>
            <th>{{ $tr('progress') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="report in reports">
            <td>
              <content-icon :kind="report.kind"/>
              {{ report.title }}
            </td>
            <td>
              {{ progressString(report) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div v-else>
      {{ $tr('noRecentProgress') }}
    </div>
  </div>

</template>


<script>

  module.exports = {
    name: 'reportList',
    $trNameSpace: 'coachRecentReports',
    $trs: {
      name: 'Name',
      progress: 'Progress',
      noRecentProgress: 'No recent progress',
      reportProgress: '{completed} {descriptor}',
    },
    components: {
      'content-icon': require('kolibri.coreVue.components.contentIcon'),
    },
    methods: {
      progressString(report) {
        return this.$tr('reportProgress', report.reportProps);
      },
    },
    vuex: {
      getters: {
        reports: state => state.pageState.reports,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  .report-list
    width: 100%
    th
      text-align: left

  // .table-wrapper
  //   overflow-x: auto

</style>
