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
        <tr v-for="channel in channels">
          <td>
            <mat-svg category="action" name="view_module" />
            <router-link :to="reportLink(channel.id)">{{ channel.title }}</router-link>
          </td>
          <td>
            {{ lastActiveText(channel.id) }}
          </td>
        </tr>
      </tbody>
    </table>

  </div>

</template>


<script>

  const PageNames = require('../../constants').PageNames;

  module.exports = {
    name: 'channelList',
    $trNameSpace: 'channelList',
    $trs: {
      channels: 'Channels',
      channelList: 'Channel list',
      lastActive: 'Last active',
    },
    methods: {
      reportLink(channelId) {
        return {
          name: PageNames.RECENT,
          params: {
            class_id: this.classId,
            channel_id: channelId,
          },
        };
      },
      lastActiveText(channelId) {
        if (this.lastActive[channelId]) {
          const lastActiveMeasure = this.lastActive[channelId].measure;
          const lastActiveAmount = this.lastActive[channelId].amount;
          return `${lastActiveAmount} ${lastActiveMeasure} ago`;
        }

        return 'Loading..';
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

  th
    text-align: left

  .channel-list
    width:100%

</style>
