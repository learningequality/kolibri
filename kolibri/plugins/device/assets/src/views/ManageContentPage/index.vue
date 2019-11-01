<template>

  <div>

    <div>
      <TaskProgress
        v-if="activeTaskList[0]"
        v-bind="activeTaskList[0]"
        @cleartask="clearCompletedTasks"
        @canceltask="cancelRunningTask(activeTaskList[0].id)"
      />

      <KGrid>
        <KGridItem
          :layout8="{ span: 4 }"
          :layout12="{ span: 6 }"
        >
          <h1>{{ coreString('channelsLabel') }}</h1>
        </KGridItem>
        <KGridItem
          v-if="!activeTaskList.length"
          :layout8="{ span: 4, alignment: 'right' }"
          :layout12="{ span: 6, alignment: 'right' }"
        >
          <KDropdownMenu
            v-if="channelsAreInstalled"
            appearance="raised-button"
            :text="coreString('optionsLabel')"
            :options="dropdownOptions"
            @select="handleSelect"
          />
          <KButton
            :text="$tr('import')"
            :primary="true"
            @click="startImportWorkflow()"
          />
        </KGridItem>
      </KGrid>

      <p v-if="!channelsAreInstalled">
        {{ $tr('emptyChannelListMessage') }}
      </p>

      <div class="channels-list">
        <ChannelPanel
          v-for="channel in installedChannelsWithResources"
          :key="channel.id"
          :channel="channel"
          @select_delete="deleteChannelId = channel.id"
          @select_manage="startImportWorkflow(channel)"
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
  import { mapState, mapGetters, mapActions } from 'vuex';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import { TaskResource } from 'kolibri.resources';
  import TaskProgress from './TaskProgress';
  import SelectTransferSourceModal from './SelectTransferSourceModal';
  import ChannelPanel from './ChannelPanel/WithSizeAndOptions';
  import DeleteChannelModal from './DeleteChannelModal';

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
      TaskProgress,
    },
    mixins: [commonCoreStrings],
    data() {
      return {
        deleteChannelId: null,
      };
    },
    computed: {
      ...mapGetters('manageContent', ['activeTaskList', 'installedChannelsWithResources']),
      ...mapState('manageContent/wizard', ['pageName']),
      channelsAreInstalled() {
        return this.installedChannelsWithResources.length > 0;
      },
      selectedChannelTitle() {
        if (this.deleteChannelId) {
          return find(this.installedChannelsWithResources, { id: this.deleteChannelId });
        }
        return '';
      },
      dropdownOptions() {
        return [
          { label: this.$tr('exportChannels'), value: 'EXPORT' },
          { label: this.$tr('deleteChannels'), value: 'DELETE' },
          { label: this.$tr('rearrangeChannels'), value: 'REARRANGE' },
        ];
      },
    },
    watch: {
      // If Tasks disappear from queue, assume that an addition/deletion has
      // completed and refresh list.
      tasksInQueue(val, oldVal) {
        if (oldVal && !val) {
          this.refreshChannelList();
        }
      },
    },
    methods: {
      ...mapActions('manageContent', [
        'cancelTask',
        'refreshChannelList',
        'startImportWorkflow',
        'triggerChannelDeleteTask',
      ]),
      cancelRunningTask(taskId) {
        this.cancelTask(taskId)
          // Handle failures silently in case of near-simultaneous cancels.
          .catch(() => {});
      },
      clearCompletedTasks() {
        return TaskResource.deleteFinishedTasks();
      },
      handleSelect({ value }) {
        const nextRoute = {
          DELETE: 'DELETE_CHANNELS',
          EXPORT: 'EXPORT_CHANNELS',
          REARRANGE: 'REARRANGE_CHANNELS',
        }[value];
        this.$router.push(this.$router.getRoute(nextRoute));
      },
      handleDeleteChannel() {
        if (this.deleteChannelId) {
          const channelId = this.selectedChannelId;
          this.deleteChannelId = null;
          this.triggerChannelDeleteTask(channelId);
        }
      },
    },
    $trs: {
      import: 'Import',
      documentTitle: 'Manage Device Channels',
      exportChannels: 'Export channels',
      deleteChannels: 'Delete channels',
      rearrangeChannels: 'Re-arrange',
      emptyChannelListMessage: 'No channels installed',
    },
  };

</script>


<style lang="scss" scoped></style>
