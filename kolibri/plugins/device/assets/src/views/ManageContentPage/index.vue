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
            @select="handleSelect"
          />
          <KButton
            :text="$tr('import')"
            :primary="true"
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
          v-for="channel in installedChannelsWithResources"
          :key="channel.id"
          :channel="channel"
          :disabled="channelIsBeingDeleted(channel.id)"
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
  import { mapState, mapGetters, mapActions } from 'vuex';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import { TaskResource } from 'kolibri.resources';
  import taskNotificationMixin from '../taskNotificationMixin';
  import { PageNames } from '../../constants';
  import SelectTransferSourceModal from './SelectTransferSourceModal';
  import ChannelPanel from './ChannelPanel/WithSizeAndOptions';
  import DeleteChannelModal from './DeleteChannelModal';
  import TasksBar from './BottomBar/TasksBar';

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
      };
    },
    computed: {
      ...mapGetters('manageContent', ['installedChannelsWithResources', 'channelIsBeingDeleted']),
      ...mapState('manageContent/wizard', ['pageName']),
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

</style>
