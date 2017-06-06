<template>

  <div>
    <table class="Table">

      <thead class="Table__header">
        <tr>
          <th>{{ $tr('nameHeader') }}</th>
          <th>{{ $tr('numContentsHeader') }}</th>
          <th>{{ $tr('sizeHeader') }}</th>
          <th>{{ $tr('lastUpdatedHeader') }}</th>
          <th></th>
        </tr>
      </thead>

      <tbody class="Table__body">
        <tr v-for="(channel, idx) in channelList">
          <td><b>{{ channel.title }}<b></td>
          <td>
            <ui-progress-circular
              color="primary"
              v-show="!numberOfFilesInChannel(channel.id)"
            />
            {{ numberOfFilesInChannel(channel.id) }}
          </td>
          <td>{{ totalSizeOfFilesInChannel(channel.id) }}</td>
          <td>{{ lastUpdatedDate(channel.id) }}</td>
          <td>
            <button
              @click="selectedChannelIdx=idx"
              class="delete-button"
            >
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
        <p>Are you sure you want to delete <b>{{ selectedChannelTitle }}</b> and its contents?</p>
        <p>To restore this channel, you will need to re-import it from the internet or storage device.</p>
      </div>

      <div class="Buttons">
        <ui-button type="secondary" @click="selectedChannelIdx=null">Cancel</ui-button>
        <ui-button type="primary" color="primary" @click="handleDeleteChannel()">Confirm</ui-button>
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
      UiButton: require('keen-ui/src/UiButton'),
      UiProgressCircular: require('keen-ui/src/UiProgressCircular'),
    },
    methods: {
      handleDeleteChannel() {
        if (this.selectedChannelIdx !== null) {
          this.deleteChannel(this.channelList[this.selectedChannelIdx].id)
          .then(() => { this.selectedChannelIdx = null; });
        }
      },
      numberOfFilesInChannel(channelId) {
        const channel = this.channelInfo[channelId];
        return channel ? channel.numberOfFiles : '';
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
        channelInfo: state => state.pageState.channelInfo,
        channelList: state => state.core.channels.list,
        pageState: state => state.pageState,
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

  @require '~kolibri.styles.definitions'

  .Table
    text-align: left
    width: 100%
    &__header
      th
        color: $core-text-annotation
        font-weight: normal
        font-size: 80%
    &__body
      td
        padding: 1rem 0

  .Buttons
    text-align: right

  .delete-button
    $red = rgb(255, 0 , 0)
    transition: none
    border-style: none
    color: $red
    &:hover
      color: darken($red, 30)

</style>
