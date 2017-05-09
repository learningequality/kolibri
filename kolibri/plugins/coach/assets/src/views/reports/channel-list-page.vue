<template>

  <div>
    <div v-if="showRecentOnly" ref="recentHeader">
      <h1>{{ $tr('recentTitle') }}</h1>
      <sub v-if="anyActivity">{{ $tr('recentSubHeading') }}</sub>
      <sub v-else>{{ $tr('noRecentSubHeading') }}</sub>
    </div>

    <report-table v-if="anyActivity" :caption="$tr('channelList')">
      <thead slot="thead">
        <tr>
          <header-cell
            :text="$tr('channels')"
            align="left"
            :sortable="true"
            :column="tableColumns.NAME"/>
          <header-cell
            :text="$tr('lastActivity')"
            align="left"
            :sortable="true"
            :column="tableColumns.DATE"/>
        </tr>
      </thead>
      <tbody slot="tbody">
        <template v-for="channel in standardDataTable">
          <tr v-if="channelIsVisible(channel.lastActive)" :key="channel.id">
            <name-cell :kind="CHANNEL" :title="channel.title" :link="reportLink(channel.id)"/>
            <activity-cell :date="channel.lastActive"/>
          </tr>
        </template>
      </tbody>
    </report-table>
  </div>

</template>


<script>

  const { ContentNodeKinds } = require('kolibri.coreVue.vuex.constants');
  const { PageNames } = require('../../constants');
  const differenceInDays = require('date-fns/difference_in_days');
  const { now } = require('kolibri.utils.serverClock');
  const reportConstants = require('../../reportConstants');
  const reportGetters = require('../../state/getters/reports');

  module.exports = {
    name: 'channelList',
    $trNameSpace: 'coachRecentPageChannelList',
    $trs: {
      recentTitle: 'Recent Activity',
      recentSubHeading: 'Showing recent activity in past 7 days',
      noRecentSubHeading: 'No recent activity in past 7 days',
      channels: 'Channels',
      channelList: 'Channel list',
      lastActivity: 'Last active',
    },
    data() {
      return {
        currentDateTime: now(),
      };
    },
    components: {
      'report-table': require('./report-table'),
      'header-cell': require('./table-cells/header-cell'),
      'name-cell': require('./table-cells/name-cell'),
      'activity-cell': require('./table-cells/activity-cell'),
    },
    computed: {
      CHANNEL() {
        return ContentNodeKinds.CHANNEL;
      },
      tableColumns() {
        return reportConstants.TableColumns;
      },
      anyActivity() {
        return this.standardDataTable.some(channel => this.channelIsVisible(channel.lastActive));
      },
    },
    methods: {
      channelIsVisible(lastActiveTime) {
        const THREHOLD_IN_DAYS = 7;
        if (!this.showRecentOnly) return true;
        return (
          Boolean(lastActiveTime) &&
          differenceInDays(this.currentDateTime, lastActiveTime) <= THREHOLD_IN_DAYS
        );
      },
      reportLink(channelId) {
        const linkTargets = {
          [PageNames.RECENT_CHANNELS]: PageNames.RECENT_ITEMS_FOR_CHANNEL,
          [PageNames.TOPIC_CHANNELS]: PageNames.TOPIC_CHANNEL_ROOT,
          [PageNames.LEARNER_CHANNELS]: PageNames.LEARNER_CHANNEL_ROOT,
        };
        return {
          name: linkTargets[this.pageName],
          params: {
            classId: this.classId,
            channelId,
          },
        };
      },
    },
    vuex: {
      getters: {
        channels: state => state.core.channels.list,
        standardDataTable: reportGetters.standardDataTable,
        classId: state => state.classId,
        pageName: state => state.pageName,
        showRecentOnly: state => state.pageState.showRecentOnly,
      },
    },
  };

</script>


<style lang="stylus" scoped></style>
