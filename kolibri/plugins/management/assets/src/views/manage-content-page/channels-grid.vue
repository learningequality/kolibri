<template>

  <div>
    <p class="core-text-alert" v-if="sortedChannels.length===0">
      {{ $tr('emptyChannelListMessage') }}
    </p>

    <table v-else class="table">

      <thead class="table-header">
        <tr>
          <th>{{ $tr('nameHeader') }}</th>
          <th>{{ $tr('numContentsHeader') }}</th>
          <th>{{ $tr('sizeHeader') }}</th>
          <th>{{ $tr('lastUpdatedHeader') }}</th>
          <th></th>
        </tr>
      </thead>

      <tbody class="table-body">
        <tr v-for="(channel, idx) in sortedChannels">
          <td class="table-cell-title">
            {{ channel.title }}
          </td>

          <td>
            <transition mode="out-in">
              <ui-progress-circular
                v-if="!numberOfFilesInChannel(channel.id)"
                :size="16"
                color="primary"
              />
              <span v-else>{{ numberOfFilesInChannel(channel.id) }}</span>
            </transition>
          </td>
          <td>
            <transition mode="out-in">
                <ui-progress-circular
                  v-if="!totalSizeOfFilesInChannel(channel.id)"
                  :size="16"
                  color="primary"
                />
                <span v-else>{{ totalSizeOfFilesInChannel(channel.id) }}</span>
              </transition>
          </td>
          <td>
            <elapsed-time :date="channel.last_updated" />
          </td>
          <td>
            <button
              @click="selectedChannelId=channel.id"
              class="delete-button"
            >
              {{ $tr('deleteButtonLabel') }}
            </button>
          </td>
        </tr>
      </tbody>

    </table>

    <delete-channel-modal
      v-if="channelIsSelected"
      :channelTitle="selectedChannelTitle"
      @confirm="handleDeleteChannel()"
      @cancel="selectedChannelId=null"
    />
  </div>

</template>


<script>

  import bytesForHumans from './bytesForHumans';
  import * as manageContentActions from '../../state/manageContentActions';
  import map from 'lodash/map';
  import orderBy from 'lodash/orderBy';
  import find from 'lodash/find';
  import uiButton from 'keen-ui/src/UiButton';
  import uiProgressCircular from 'keen-ui/src/UiProgressCircular';
  import deleteChannelModal from './delete-channel-modal';
  import elapsedTime from 'kolibri.coreVue.components.elapsedTime';
  export default {
    data: () => ({
      selectedChannelId: null,
      notification: null,
    }),
    computed: {
      channelIsSelected() {
        return this.selectedChannelId !== null;
      },
      selectedChannelTitle() {
        if (this.channelIsSelected) {
          const channel = find(this.channelList, { id: this.selectedChannelId });
          return channel.title;
        }
        return '';
      },
      sortedChannels() {
        return orderBy(this.channelList, [channel => channel.title.toUpperCase()], ['asc']);
      },
    },
    components: {
      uiButton,
      uiProgressCircular,
      deleteChannelModal,
      elapsedTime,
    },
    mounted() {
      this.addChannelFileSummaries(map(this.channelList, 'id'));
    },
    watch: {
      channelList(val, newVal) {
        this.addChannelFileSummaries(map(newVal, 'id'));
      },
    },
    methods: {
      handleDeleteChannel() {
        if (this.selectedChannelId !== null) {
          const channelId = this.selectedChannelId;
          this.selectedChannelId = null;
          this.deleteChannel(channelId)
            .then(() => {
              this.$emit('deletesuccess');
            })
            .catch(() => {
              this.$emit('deletefailure');
            });
        }
      },
      numberOfFilesInChannel(channelId) {
        const channel = this.channelFileSummaries[channelId];
        return channel ? channel.numberOfFiles : '';
      },
      totalSizeOfFilesInChannel(channelId) {
        const channel = this.channelFileSummaries[channelId];
        return this.channelFileSummaries[channelId]
          ? bytesForHumans(channel.totalFileSizeInBytes)
          : '';
      },
    },
    vuex: {
      getters: {
        channelFileSummaries: state => state.pageState.channelFileSummaries,
        channelList: state => state.core.channels.list,
        pageState: state => state.pageState,
      },
      actions: {
        deleteChannel: manageContentActions.deleteChannel,
        addChannelFileSummaries: manageContentActions.addChannelFileSummaries,
      },
    },
    name: 'channelsGrid',
    $trs: {
      emptyChannelListMessage: 'No channels installed',
      deleteButtonLabel: 'Delete',
      lastUpdatedHeader: 'Last updated',
      nameHeader: 'Channel',
      numContentsHeader: '# Contents',
      sizeHeader: 'Size',
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  .table
    text-align: left
    width: 100%

  .table-header
    th
      color: $core-text-annotation
      font-weight: normal
      font-size: 80%

  .table-body
    td
      padding: 1rem 0

  .table-cell-title
    font-weight: bold

  .delete-button
    $red = rgb(255, 0 , 0)
    transition: none
    border-style: none
    color: $red
    &:hover
      color: darken($red, 30)

</style>
