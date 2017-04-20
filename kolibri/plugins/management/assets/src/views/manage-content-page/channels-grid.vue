<template>

  <table class="tal">
    <thead>
      <tr>
        <th class="col-header col-channel" scope="col"> Channel Name </th>
        <th class="col-header col-export" scope="col"> # of Contents </th>
        <th class="col-header col-export" scope="col"> Size </th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="channel in channelList">
        <td scope="row">
          <b>{{ channel.title }}<b>
        </td>
        <td>
          {{ numberOfFilesInChannel(channel.id) }}
        </td>
        <td>
          {{ totalSizeOfFilesInChannel(channel.id) }}
        </td>
      </tr>
    </tbody>
  </table>

</template>


<script>

  const bytesForHumans = require('./bytesForHumans');

  module.exports = {
    methods: {
      numberOfFilesInChannel(channelId) {
        const channel = this.channelInfo[channelId];
        return channel ? channel.numberOfFiles : 'Please wait...';
      },
      totalSizeOfFilesInChannel(channelId) {
        const channel = this.channelInfo[channelId];
        return this.channelInfo[channelId] ? bytesForHumans(channel.totalFileSizeInBytes) : '';
      },
    },
    vuex: {
      getters: {
        channelList: state => state.core.channels.list,
        pageState: state => state.pageState,
        channelInfo: state => state.pageState.channelInfo
      },
    },
  };

</script>


<style lang="stylus" scoped>

  $row-padding = 1.5em
  // height of elements in toolbar,  based off of icon-button height
  $toolbar-height = 36px

  .tal
    text-align: left

  td
    padding-bottom: 2rem


  .col-header
    padding-bottom: (1.2 * $row-padding)
    color: $core-text-annotation
    font-weight: normal
    font-size: 80%

</style>
