<template>

  <div>
    <p class="core-text-alert" v-if="sortedChannels.length===0 && !this.channelsLoading">
      {{ $tr('emptyChannelListMessage') }}
    </p>

    <ui-progress-circular v-else-if="this.channelsLoading" :size="16" color="primary"/>

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
        <tr v-for="channel in sortedChannels" :key="channel.id">
          <td class="table-cell-title">
            {{ channel.name }}
          </td>

          <td>
            <span>{{ channel.total_files }}</span>
          </td>
          <td>
            <span>{{ bytesForHumans(channel.total_file_size) }}</span>
          </td>
          <td>
            <elapsed-time :date="channel.last_updated" />
          </td>
          <td>
            <k-button
              @click="selectedChannelId=channel.id"
              :raised="false"
              :text="$tr('deleteButtonLabel')"
            />
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
  import { deleteChannel, refreshChannelList } from '../../state/actions/contentActions';
  import kButton from 'kolibri.coreVue.components.kButton';
  import uiProgressCircular from 'keen-ui/src/UiProgressCircular';
  import deleteChannelModal from './delete-channel-modal';
  import elapsedTime from 'kolibri.coreVue.components.elapsedTime';
  export default {
    name: 'channelsGrid',
    components: {
      uiProgressCircular,
      deleteChannelModal,
      elapsedTime,
      kButton,
    },
    data: () => ({
      selectedChannelId: null,
      notification: null,
      channelsLoading: true,
    }),
    created() {
      this.refreshChannelList().then(() => {
        this.channelsLoading = false;
      });
    },
    computed: {
      channelIsSelected() {
        return this.selectedChannelId !== null;
      },
      selectedChannelTitle() {
        if (this.channelIsSelected) {
          return this.channelList.find(channel => channel.id === this.selectedChannelId).name;
        }
        return '';
      },
      sortedChannels() {
        return this.channelList.sort(channel => channel.name);
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
      bytesForHumans(size) {
        return size ? bytesForHumans(size) : '';
      },
    },
    vuex: {
      getters: {
        channelList: state => state.pageState.channelList,
        pageState: state => state.pageState,
      },
      actions: {
        deleteChannel,
        refreshChannelList,
      },
    },
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

</style>
