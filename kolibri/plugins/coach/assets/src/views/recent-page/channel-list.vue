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
            <elapsed-time v-if="lastActive[channel.id]" :date="lastActive[channel.id]" />
          </td>
        </tr>
      </tbody>
    </table>
  </div>

</template>


<script>

  const PageNames = require('../../constants').PageNames;
  const orderBy = require('lodash/orderby');

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
        return orderBy(this.channels, [channel => this.lastActive[channel.id]]);
      },
    },
    methods: {
      reportLink(channelId) {
        return {
          name: PageNames.RECENT,
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
