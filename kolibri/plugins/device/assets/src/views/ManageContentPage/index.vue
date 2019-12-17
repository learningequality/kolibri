<template>

  <div>

    <div>
      <KGrid>
        <KGridItem
          :layout8="{ span: 4 }"
          :layout12="{ span: 6 }"
        >
          <h1>{{ coreString('channelsLabel') }}</h1>
        </KGridItem>
        <KGridItem
          :layout8="{ span: 4, alignment: 'right' }"
          :layout12="{ span: 6, alignment: 'right' }"
          class="buttons"
        >
          <KDropdownMenu
            v-if="channelsAreInstalled"
            appearance="raised-button"
            :text="coreString('optionsLabel')"
            position="bottom left"
            :options="dropdownOptions"
            class="options-btn"
            @select="handleSelect"
          />
          <KButton
            :text="$tr('import')"
            :primary="true"
            class="import-btn"
            @click="startImportWorkflow()"
          />
        </KGridItem>
      </KGrid>

      <TasksBar />

      <p>
        <KRouterLink
          appearance="basic-link"
          :text="$tr('taskManagerLink')"
          :to="{name: 'MANAGE_TASKS'}"
        />
      </p>

      <p v-if="!channelsAreInstalled">
        {{ $tr('emptyChannelListMessage') }}
      </p>

      <div class="channels-list">
        <ChannelPanel
          v-for="channel in sortedChannels"
          :key="channel.id"
          :channel="channel"
          :disabled="channelIsBeingDeleted(channel.id)"
          :showNewLabel="showNewLabel(channel.id)"
          @select_delete="deleteChannelId = channel.id"
          @select_manage="handleSelectManage(channel.id)"
        />
      </div>

      <SelectTransferSourceModal :pageName="pageName" />

      <DeleteChannelModal
        v-if="deleteChannelId"
        :channelTitle="selectedChannelTitle"
        @submit="handleDeleteChannel"
        @cancel="deleteChannelId=null"
      />
    </div>


  </div>

</template>


<script>

  import find from 'lodash/find';
  import get from 'lodash/get';
  import sortBy from 'lodash/sortBy';
  import { mapState, mapGetters, mapActions } from 'vuex';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import { TaskResource } from 'kolibri.resources';
  import taskNotificationMixin from '../taskNotificationMixin';
  import { PageNames, TaskStatuses } from '../../constants';
  import SelectTransferSourceModal from './SelectTransferSourceModal';
  import ChannelPanel from './ChannelPanel/WithSizeAndOptions';
  import DeleteChannelModal from './DeleteChannelModal';
  import TasksBar from './TasksBar';

  export default {
    name: 'ManageContentPage',
    metaInfo() {
      return {
        title: this.$tr('documentTitle'),
      };
    },
    components: {
      ChannelPanel,
      DeleteChannelModal,
      SelectTransferSourceModal,
      TasksBar,
    },
    mixins: [commonCoreStrings, taskNotificationMixin],
    data() {
      return {
        deleteChannelId: null,
        channelOrders: {},
      };
    },
    computed: {
      ...mapGetters('manageContent', [
        'installedChannelsWithResources',
        'channelIsBeingDeleted',
        'managedTasks',
      ]),
      ...mapState('manageContent/wizard', ['pageName']),
      doneTasks() {
        return this.managedTasks.filter(task => task.status === TaskStatuses.COMPLETED).length;
      },
      sortedChannels() {
        return sortBy(
          this.installedChannelsWithResources,
          channel => -this.channelOrders[channel.id]
        );
      },
      channelsAreInstalled() {
        return this.installedChannelsWithResources.length > 0;
      },
      selectedChannelTitle() {
        if (this.deleteChannelId) {
          return find(this.installedChannelsWithResources, { id: this.deleteChannelId }).name;
        }
        return '';
      },
      dropdownOptions() {
        return [
          { label: this.$tr('exportChannels'), value: 'EXPORT' },
          { label: this.$tr('deleteChannels'), value: 'DELETE' },
          { label: this.$tr('editChannelOrder'), value: 'REARRANGE' },
        ];
      },
    },
    watch: {
      installedChannelsWithResources: {
        // Save channel orders that are set temporarily based on managedTasks
        handler(val) {
          val.forEach(channel => {
            const currentOrder = this.channelOrders[channel.id];
            if ((!currentOrder && channel.taskIndex > -1) || currentOrder < channel.taskIndex) {
              this.$set(this.channelOrders, channel.id, channel.taskIndex);
            }
          });
        },
        immediate: true,
        deep: true,
      },
      doneTasks(val, oldVal) {
        // Just refresh the channel list whenever anything finishes to get the latest version
        if (val > oldVal) {
          this.refreshChannelList();
        }
      },
    },
    methods: {
      ...mapActions('manageContent', ['refreshChannelList', 'startImportWorkflow']),
      handleSelect({ value }) {
        const nextRoute = {
          DELETE: PageNames.DELETE_CHANNELS,
          EXPORT: PageNames.EXPORT_CHANNELS,
          REARRANGE: PageNames.REARRANGE_CHANNELS,
        }[value];
        this.$router.push(this.$router.getRoute(nextRoute));
      },
      showNewLabel(channelId) {
        const match = find(this.installedChannelsWithResources, { id: channelId });
        return match && match.taskIndex > -1;
      },
      handleDeleteChannel() {
        if (this.deleteChannelId) {
          const channelId = this.deleteChannelId;
          this.deleteChannelId = null;
          return TaskResource.deleteChannel({ channelId })
            .then(task => {
              this.notifyAndWatchTask(task);
            })
            .catch(err => {
              // Silently handle double-deletions
              // TODO make double-deletion return a 404 error
              if (get(err, 'entity[0]') === 'This channel does not exist') {
                this.refreshChannelList();
              } else {
                this.createTaskFailedSnackbar();
              }
            });
        }
      },
      handleSelectManage(channelId) {
        this.$router.push({ name: PageNames.MANAGE_CHANNEL, params: { channel_id: channelId } });
      },
      // @public (used by taskNotificationMixin)
      onWatchedTaskFinished() {
        this.refreshChannelList();
      },
    },
    $trs: {
      import: 'Import',
      documentTitle: 'Manage Device Channels',
      exportChannels: 'Export channels',
      deleteChannels: 'Delete channels',
      editChannelOrder: 'Edit channel order',
      emptyChannelListMessage: 'No channels installed',
      taskManagerLink: 'View task manager',
    },
  };

</script>


<style lang="scss" scoped>

  .buttons {
    margin: auto;
  }

  .options-btn {
    margin: 0;
    margin-right: 16px;
  }

  .import-btn {
    margin: 0;
  }

</style>
