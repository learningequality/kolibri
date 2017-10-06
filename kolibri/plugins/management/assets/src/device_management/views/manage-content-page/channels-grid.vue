<template>

  <div>
    <transition mode="out-in">
      <p class="core-text-alert" v-if="sortedChannels.length===0 && !this.channelsLoading">
        {{ $tr('emptyChannelListMessage') }}
      </p>

      <ui-progress-circular v-else-if="this.channelsLoading" :size="16" color="primary"/>

      <table v-else class="table">

        <thead class="table-header">
          <tr>
            <th>{{ $tr('nameHeader') }}</th>
            <th>{{ $tr('numResourcesHeader') }}</th>
            <th>{{ $tr('sizeHeader') }}</th>
            <th>{{ $tr('lastUpdatedHeader') }}</th>
            <th></th>
          </tr>
        </thead>

        <tbody class="table-body">
          <tr v-for="channel in sortedChannels" :key="channel.id">
            <td>
              <div>{{ channel.name }}</div>
              <div class="channel-version">
                {{ $tr('channelVersion', { versionNumber: channel.version }) }}
              </div>
            </td>

            <td>
              <span>{{ channel.total_resources }}</span>
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
                appearance="flat"
                :text="$tr('deleteButtonLabel')"
                :disabled="tasksInQueue"
              />
            </td>
          </tr>
        </tbody>

      </table>
    </transition>

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
  import { refreshChannelList } from '../../state/actions/manageContentActions';
  import kButton from 'kolibri.coreVue.components.kButton';
  import uiProgressCircular from 'keen-ui/src/UiProgressCircular';
  import deleteChannelModal from './delete-channel-modal';
  import elapsedTime from 'kolibri.coreVue.components.elapsedTime';
  import { triggerChannelDeleteTask } from '../../state/actions/taskActions';
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
    created() {
      this.refreshChannelList().then(() => {
        this.channelsLoading = false;
      });
    },
    methods: {
      handleDeleteChannel() {
        if (this.selectedChannelId !== null) {
          const channelId = this.selectedChannelId;
          this.selectedChannelId = null;
          this.triggerChannelDeleteTask(channelId);
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
        tasksInQueue: ({ pageState }) => pageState.taskList.length > 0,
      },
      actions: {
        triggerChannelDeleteTask,
        refreshChannelList,
      },
    },
    $trs: {
      emptyChannelListMessage: 'No channels installed',
      deleteButtonLabel: 'Delete',
      lastUpdatedHeader: 'Last updated',
      nameHeader: 'Channel',
      numResourcesHeader: 'Resources',
      sizeHeader: 'Size',
      channelVersion: 'Version {versionNumber}',
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

  .channel-version
    font-size: 0.85em
    line-height: 1.5em
    color: $core-text-annotation

</style>
