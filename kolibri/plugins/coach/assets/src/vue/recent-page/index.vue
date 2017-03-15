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

  const Constants = require('../../state/constants');

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
    data() {
      return {
        classId: '',
      };
    },
    computed: {
      channelNotSelected() {
        return this.subPageName === Constants.PageNames.COACH_RECENT_PAGE_CHANNEL_SELECT;
      },
    },
    methods: {
    },
    vuex: {
      getters: {
        subPageName: state => state.pageState.subPageName,
      },
    },
  };

</script>


<style lang="stylus" scoped></style>
