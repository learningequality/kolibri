<template>

  <table class="tal">
    <thead>
      <tr>
        <th class="col-header col-channel" scope="col">{{ $tr('nameHeader') }}</th>
        <th class="col-header col-export" scope="col">{{ $tr('numContentsHeader') }}</th>
        <th class="col-header col-export" scope="col">{{ $tr('sizeHeader') }}</th>
        <th class="col-header col-export" scope="col"></th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="channel in channelList">
        <td>
          <b>{{ channel.title }}<b>
        </td>
        <td>
          {{ numberOfFilesInChannel(channel.id) }}
        </td>
        <td>
          {{ totalSizeOfFilesInChannel(channel.id) }}
        </td>
        <td>
          <button class="delete-button">
            {{ $tr('delete') }}
          </button>
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
        return channel ? channel.numberOfFiles : this.$tr('pleaseWait');
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
    $trNameSpace: 'channelsGrid',
    $trs: {
      pleaseWait: 'Please wait...',
      nameHeader: 'Channel',
      numContentsHeader: '# Contents',
      sizeHeader: 'Size',
      delete: 'Delete',
    }
  };

</script>


<style lang="stylus" scoped>

  $row-padding = 1.5em
  // height of elements in toolbar,  based off of icon-button height
  $toolbar-height = 36px
  $red = rgb(255, 0 , 0)

  .tal
    text-align: left

  td
    padding: 1rem 0

  .delete-button
    transition: none
    border-style: none
    color: $red
    &:hover
      color: darken($red, 30)

  .col-header
    padding-bottom: (1.2 * $row-padding)
    color: $core-text-annotation
    font-weight: normal
    font-size: 80%

</style>
