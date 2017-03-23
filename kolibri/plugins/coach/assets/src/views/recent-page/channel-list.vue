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
            class_id: this.classID,
            channel_id: channelID,
          },
        };
      },
    },
    vuex: {
      getters: {
        channels: state => state.pageState.channels,
        classID: state => state.pageState.class_id,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  th
    text-align: left

</style>
