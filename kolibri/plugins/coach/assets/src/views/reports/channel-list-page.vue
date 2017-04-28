<template>

  <report-table :caption="$tr('channelList')">
    <thead slot="thead">
      <tr>
        <header-cell :text="$tr('channels')" align="left"/>
        <header-cell :text="$tr('lastActivity')" align="left"/>
      </tr>
    </thead>
    <tbody slot="tbody">
      <template v-for="row in channelList">
        <tr v-if="channelIsVisible(lastActive[row.id])" :key="row.id">
          <name-cell :kind="CHANNEL" :title="row.title" :link="reportLink(row.id)"/>
          <activity-cell :date="lastActive[row.id]" />
        </tr>
      </template>
    </tbody>
  </report-table>

</template>


<script>

  const ContentNodeKinds = require('kolibri.coreVue.vuex.constants').ContentNodeKinds;
  const PageNames = require('../../constants').PageNames;
  const orderBy = require('lodash/orderBy');
  const differenceInDays = require('date-fns/difference_in_days');

  module.exports = {
    name: 'channelList',
    $trNameSpace: 'coachRecentPageChannelList',
    $trs: {
      channels: 'Channels',
      channelList: 'Channel list',
      lastActivity: 'Last active',
    },
    data() {
      return {
        currentDateTime: Date.now(),
      };
    },
    components: {
      'report-table': require('./report-table'),
      'header-cell': require('./table-cells/header-cell'),
      'name-cell': require('./table-cells/name-cell'),
      'activity-cell': require('./table-cells/activity-cell'),
    },
    computed: {
      CHANNEL() { return ContentNodeKinds.CHANNEL; },
      channelList() {
        const orderedLists = {
          [PageNames.RECENT_CHANNELS]: orderBy(
            this.channels,
            [channel => this.lastActive[channel.id] || '', 'title'],
            ['desc', 'asc']
          ),
          [PageNames.TOPIC_CHANNELS]: orderBy(this.channels, ['title']),
          [PageNames.LEARNER_CHANNELS]: orderBy(this.channels, ['title']),
        };
        return orderedLists[this.pageName];
      },
    },
    methods: {
      channelIsVisible(lastActiveTime) {
        const THREHOLD_IN_DAYS = 7;
        if (this.showRecentOnly) {
          return (
            Boolean(lastActiveTime) &&
            differenceInDays(this.currentDateTime, lastActiveTime) <= THREHOLD_IN_DAYS
          );
        }
        return true;
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
        lastActive: state => state.pageState.lastActive,
        classId: state => state.classId,
        pageName: state => state.pageName,
        showRecentOnly: state => state.pageState.showRecentOnly,
      },
    },
  };

</script>


<style lang="stylus" scoped></style>
