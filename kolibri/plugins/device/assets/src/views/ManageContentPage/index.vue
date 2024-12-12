<template>

  <DeviceAppBarPage :title="pageTitle">
    <transition name="delay<-entry">
      <PostSetupModalGroup
        v-if="!channelListLoading && welcomeModalVisible"
        @cancel="hideWelcomeModal"
      />
    </transition>

    <KPageContainer class="device-container">
      <div>
        <HeaderWithOptions :headerText="coreString('channelsLabel')">
          <template #options>
            <KButtonGroup>
              <!-- Margins to and bottom adds space when buttons are vertically stacked -->
              <KButton
                v-if="channelsAreInstalled"
                hasDropdown
                appearance="raised-button"
                :text="coreString('optionsLabel')"
                :style="{ margin: '16px 8px -16px 0' }"
              >
                <template #menu>
                  <KDropdownMenu
                    position="bottom left"
                    :options="dropdownOptions"
                    @select="handleSelect"
                  />
                </template>
              </KButton>
              <KButton
                :text="$tr('import')"
                style="margin-top: 16px; margin-bottom: -16px"
                :primary="true"
                @click="startImportWorkflow()"
              />
            </KButtonGroup>
          </template>
        </HeaderWithOptions>

        <TasksBar
          v-if="managedTasks.length > 0"
          :tasks="managedTasks"
          :taskManagerLink="{ name: 'MANAGE_TASKS' }"
          @clearall="handleClickClearAll"
        />

        <p v-if="!channelsAreInstalled && !channelListLoading">
          {{ $tr('emptyChannelListMessage') }}
        </p>

        <div class="channels-list">
          <KCircularLoader v-if="channelListLoading" />
          <div v-else>
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
        </div>

        <SelectTransferSourceModal :pageName="pageName" />

        <DeleteChannelModal
          v-if="deleteChannelId"
          :channelTitle="selectedChannelTitle"
          @submit="handleDeleteChannel"
          @cancel="deleteChannelId = null"
        />
      </div>
    </KPageContainer>
  </DeviceAppBarPage>

</template>


<script>

  import find from 'lodash/find';

  import get from 'lodash/get';
  import sortBy from 'lodash/sortBy';
  import { mapState, mapGetters, mapActions } from 'vuex';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import TaskResource from 'kolibri/apiResources/TaskResource';
  import { TaskStatuses, TaskTypes } from 'kolibri-common/utils/syncTaskUtils';
  import useUser from 'kolibri/composables/useUser';
  import DeviceAppBarPage from '../DeviceAppBarPage';
  import taskNotificationMixin from '../taskNotificationMixin';
  import useContentTasks from '../../composables/useContentTasks';
  import { PageNames } from '../../constants';
  import HeaderWithOptions from '../HeaderWithOptions';
  import { deviceString } from '../commonDeviceStrings';
  import PostSetupModalGroup from '../PostSetupModalGroup';
  import SelectTransferSourceModal from './SelectTransferSourceModal';
  import ChannelPanel from './ChannelPanel/WithSizeAndOptions';
  import DeleteChannelModal from './DeleteChannelModal';
  import TasksBar from './TasksBar';

  const welcomeDismissalKey = 'DEVICE_WELCOME_MODAL_DISMISSED';

  export default {
    name: 'ManageContentPage',
    metaInfo() {
      return {
        title: this.$tr('documentTitle'),
      };
    },
    components: {
      DeviceAppBarPage,
      ChannelPanel,
      PostSetupModalGroup,
      DeleteChannelModal,
      HeaderWithOptions,
      SelectTransferSourceModal,
      TasksBar,
    },
    mixins: [commonCoreStrings, taskNotificationMixin],
    setup() {
      useContentTasks();
      const { isLearnerOnlyImport } = useUser();
      return { isLearnerOnlyImport };
    },
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
      ...mapState('manageContent', ['channelListLoading']),
      ...mapState({
        welcomeModalVisibleState: 'welcomeModalVisible',
      }),
      pageTitle() {
        return deviceString('deviceManagementTitle');
      },
      doneTasks() {
        return this.managedTasks.filter(task => task.status === TaskStatuses.COMPLETED).length;
      },
      sortedChannels() {
        return sortBy(this.installedChannelsWithResources, channel => {
          // Push Channels with Tasks to the top
          const order = -this.channelOrders[channel.id];
          // Need to explicitly return a number to correctly sort in Firefox
          return Number.isNaN(order) ? 1 : order;
        });
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
          {
            label: this.$tr('editChannelOrder'),
            value: 'REARRANGE',
            disabled: this.installedChannelsWithResources.length === 1,
          },
        ];
      },
      welcomeModalVisible() {
        return (
          this.welcomeModalVisibleState &&
          window.localStorage.getItem(welcomeDismissalKey) !== 'true' &&
          (!this.installedChannelsWithResources.length > 0) & !this.isLearnerOnlyImport
        );
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
    created() {
      if (!this.channelsAreInstalled) {
        this.$store.commit('SET_WELCOME_MODAL_VISIBLE', true);
      }
    },
    methods: {
      ...mapActions('manageContent', ['refreshChannelList', 'startImportWorkflow']),
      hideWelcomeModal() {
        window.localStorage.setItem(welcomeDismissalKey, true);
        this.$store.commit('SET_WELCOME_MODAL_VISIBLE', false);
      },
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
          return TaskResource.startTask({
            type: TaskTypes.DELETECHANNEL,
            channel_id: channelId,
            channel_name: this.selectedChannelTitle,
          })
            .then(task => {
              this.notifyAndWatchTask(task);
            })
            .catch(err => {
              // Silently handle double-deletions
              // TODO make double-deletion return a 404 error
              if (get(err, 'data[0]') === 'This channel does not exist') {
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
      handleClickClearAll() {
        TaskResource.clearAll();
      },
      /**
       * @public
       * Used by the taskNotificationMixin to handle the completion of the task
       */
      onWatchedTaskFinished() {
        this.refreshChannelList();
      },
    },
    $trs: {
      import: {
        message: 'Import',
        context: 'Option to import channels or users from another device.',
      },
      documentTitle: {
        message: 'Manage Device Channels',
        context: 'Title of page where admin can manage channels on the device.',
      },
      exportChannels: {
        message: 'Export channels',
        context: 'Option to export channels to another device.',
      },
      deleteChannels: {
        message: 'Delete channels',
        context: 'Option to delete specific channels from the device.',
      },
      editChannelOrder: {
        message: 'Edit channel order',
        context:
          'Option to control the order in which channels will be displayed to learners and coaches.',
      },
      emptyChannelListMessage: {
        message: 'No channels installed',
        context: 'Will display if there are no channels in the Device > Channels section.',
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '../../styles/definitions';

  .device-container {
    @include device-kpagecontainer;
  }

  .buttons {
    margin: auto;
  }

</style>
