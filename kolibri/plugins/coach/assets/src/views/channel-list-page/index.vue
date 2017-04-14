<template>

  <div>
    <caption class="visuallyhidden">{{ $tr('channelList') }}</caption>
    <table class="channel-list">
      <thead>
        <tr>
          <th scope="col">{{ $tr('channels') }}</th>
          <th scope="col">{{ $tr('lastActive') }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="channel in channelList">
          <td>
            <mat-svg category="action" name="view_module" />
            <router-link :to="reportLink(channel.id)">{{ channel.title }}</router-link>
          </td>
          <td>
            <elapsed-time :date="lastActive[channel.id]" />
          </td>
        </tr>
      </tbody>
    </table>
  </div>

</template>


<script>

  const PageNames = require('../../constants').PageNames;
  const orderBy = require('lodash/orderBy');

  module.exports = {
    name: 'channelList',
    $trNameSpace: 'coachRecentPageChannelList',
    $trs: {
      channels: 'Channels',
      channelList: 'Channel list',
      lastActive: 'Last active',
    },
    components: {
      'elapsed-time': require('../elapsed-time'),
    },
    computed: {
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
        classId: state => state.pageState.classId,
        pageName: state => state.pageName,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  .channel-list
    width:100%

    th
      text-align: left

</style>
