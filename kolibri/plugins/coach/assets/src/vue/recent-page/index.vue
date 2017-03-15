<template>

  <div id="recent">
    <channel-list v-if="channelNotSelected" />
    <div v-else>
      <table>
        <thead>
          <tr>
            <th> Name </th>
          </tr>
          <tr>
            <th> Progress </th>
          </tr>
        </thead>

        <tbody>
          <tr v-for="report in reports">
            <td>
              {{report.name}}
            </td>
            <td>
              {{report.progress}}
            </td>
          </tr>
        </tbody>

      </table>
    </div>
  </div>

</template>


<script>

  const PageNames = require('../../state/constants').PageNames;

  module.exports = {
    $trNameSpace: 'coachRecentPage',
    $trs: {
      recentPage: 'Recent Page',
      header: 'Recent Activity - ',
      pageDescription: 'Content your Learners have recently completed or mastered',
      name: 'Name',
      progress: 'Progress',
      noRecentProgressExist: 'No recent progress.'
    },
    components: {
      'channel-list': require('./channel-list'),
    },
    computed: {
      channelNotSelected() {
        return this.subPageName === PageNames.COACH_RECENT_PAGE_CHANNEL_SELECT;
      },
    },
    methods: {
    },
    vuex: {
      getters: {
        subPageName: state => state.pageState.subPageName,
        reports: state => state.pageState.reports,
      },
    },
  };

</script>


<style lang="stylus" scoped></style>
