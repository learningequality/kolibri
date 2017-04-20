<template>

  <div>
    <table class="tal">
      <thead>
        <tr>
          <th class="col-header col-channel" scope="col">{{ $tr('nameHeader') }}</th>
          <th class="col-header col-export" scope="col">{{ $tr('numContentsHeader') }}</th>
          <th class="col-header col-export" scope="col">{{ $tr('sizeHeader') }}</th>
          <th class="col-header col-export" scope="col">{{ $tr('lastUpdatedHeader') }}</th>
          <th class="col-header col-export" scope="col"></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(channel, idx) in channelList">
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
            {{ lastUpdatedDate(channel.id) }}
          </td>
          <td>
            <button @click="selectedChannelIdx=idx" class="delete-button">
              {{ $tr('delete') }}
            </button>
          </td>
        </tr>
      </tbody>
    </table>

    <modal
      title="Delete channel"
      v-if="channelIsSelected"
      @cancel="selectedChannelIdx=null"
    >
      <div>
        <p>Are you sure you want to delete {{ selectedChannelTitle }} and its contents?</p>
        <p>To restore this channel, you will need to re-import it from the internet or storage device.</p>
      </div>

      <div>
        <button @click="selectedChannelIdx=null">Cancel</button>
        <button @click="handleDeleteChannel()">Confirm</button>
      </div>

    </modal>
  <div>

</template>


<script>

  const bytesForHumans = require('./bytesForHumans');
  const actions = require('../../state/actions');

  module.exports = {
    data: () => ({
      selectedChannelIdx: null,
    }),
    computed: {
      channelIsSelected() {
        return this.selectedChannelIdx !== null;
      },
      selectedChannelTitle() {
        if (this.channelIsSelected) {
          return this.channelList[this.selectedChannelIdx].title;
        }
        return '';
      }
    },
    components: {
      modal: require('kolibri.coreVue.components.coreModal'),
    },
    methods: {
      handleDeleteChannel() {
        if (this.selectedChannelIdx !== null) {
          this.deleteChannel(this.channelList[this.selectedChannelIdx].id);
        }
      },
      numberOfFilesInChannel(channelId) {
        const channel = this.channelInfo[channelId];
        return channel ? channel.numberOfFiles : this.$tr('pleaseWait');
      },
      totalSizeOfFilesInChannel(channelId) {
        const channel = this.channelInfo[channelId];
        return this.channelInfo[channelId] ? bytesForHumans(channel.totalFileSizeInBytes) : '';
      },
      lastUpdatedDate(channelId) {
        // constant function until this data is available
        return this.$tr('notAvailable');
      }
    },
    vuex: {
      getters: {
        channelList: state => state.core.channels.list,
        pageState: state => state.pageState,
        channelInfo: state => state.pageState.channelInfo
      },
      actions: {
        deleteChannel: actions.deleteChannel,
      },
    },
    $trNameSpace: 'channelsGrid',
    $trs: {
      delete: 'Delete',
      lastUpdatedHeader: 'Last updated',
      nameHeader: 'Channel',
      notAvailable: 'Not available',
      numContentsHeader: '# Contents',
      pleaseWait: 'Please wait...',
      sizeHeader: 'Size',
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
