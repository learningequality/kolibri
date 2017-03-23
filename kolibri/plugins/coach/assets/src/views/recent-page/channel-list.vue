<template>

  <div>
    <caption class="visuallyhidden">{{ $tr('channelList') }}</caption>
    <table>
      <thead>
        <tr>
          <th scope="col">{{ $tr('channels') }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="channel in channels">
          <td>
            <router-link :to="reportLink(channel.id)">{{ channel.name }}</router-link>
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
    $trNameSpace: 'coachRecentPage',
    $trs: {
      channels: 'Channels',
      channelList: 'Channel list',
    },
    methods: {
      reportLink(channelID) {
        return {
          name: PageNames.RECENT,
          params: {
            class_id: this.classId,
            channel_id: channelID,
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

</style>
