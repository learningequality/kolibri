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
            <td>{{ report.title }}</td>
            <td>{{ report.progress[0].total_progress }}</td>
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
      noRecentProgress: 'No recent progress'
    },
    props: {
      reports: {
        type: Array,
        required: true,
      }
    }
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
