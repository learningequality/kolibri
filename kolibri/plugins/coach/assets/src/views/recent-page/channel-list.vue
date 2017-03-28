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
            <router-link :to="reportLink(channel.id)">{{ channel.name }}</router-link>
          </td>
          <td>
            {{ channel.lastActive }}
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
    },
    vuex: {
      getters: {
        channels: state => state.pageState.channels,
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
