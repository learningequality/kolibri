<template>

  <ImmersivePage
    :appBarTitle="appBarTitle"
    :route="backRoute"
    :loading="loading"
  >
    <KPageContainer
      v-if="!loading"
      class="device-container"
    >
      <FilteredChannelListContainer
        :channels="allChannels"
        :selectedChannels.sync="selectedChannels"
        :selectAllCheckbox="true"
      >
        <template #header>
          <h1>{{ $tr('channelsOnDevice') }}</h1>
        </template>

        <template #default="{ showItem, handleChange, itemIsSelected }">
          <ChannelPanel
            v-for="channel in allChannels"
            v-show="showItem(channel)"
            :key="channel.id"
            :channel="channel"
            :selectedMessage="channelSelectedMessage(channel)"
            :checked="itemIsSelected(channel)"
            @checkboxchange="handleChange"
          />
        </template>
      </FilteredChannelListContainer>

      <component
        :is="exportMode ? 'SelectDriveModal' : 'DeleteChannelModal'"
        v-if="showModal"
        v-bind="modalProps"
        @cancel="showModal = false"
        @submit="handleClickModalSubmit"
      />

      <SelectionBottomBar
        objectType="channel"
        :disabled="selectedChannels.length === 0"
        :actionType="actionType"
        :selectedObjects="selectedChannels"
        :fileSize.sync="fileSize"
        @clickconfirm="handleClickConfirm"
      />
    </KPageContainer>
  </ImmersivePage>

</template>


<script>

  import { mapGetters } from 'vuex';
  import find from 'lodash/find';
  import bytesForHumans from 'kolibri/uiText/bytesForHumans';
  import ImmersivePage from 'kolibri/components/pages/ImmersivePage';
  import TaskResource from 'kolibri/apiResources/TaskResource';
  import { TaskTypes } from 'kolibri-common/utils/syncTaskUtils';
  import { PageNames } from '../../constants';
  import DeviceChannelResource from '../../apiResources/deviceChannel';
  import useContentTasks from '../../composables/useContentTasks';
  import taskNotificationMixin from '../taskNotificationMixin';
  import SelectionBottomBar from './SelectionBottomBar';
  import DeleteChannelModal from './DeleteChannelModal';
  import SelectDriveModal from './SelectTransferSourceModal/SelectDriveModal';
  import ChannelPanel from './ChannelPanel/WithCheckbox';
  import FilteredChannelListContainer from './FilteredChannelListContainer';

  // UI for simple bulk Deletion or Export of entire channels
  export default {
    name: 'DeleteExportChannelsPage',
    metaInfo() {
      return {
        title: this.deleteMode ? this.$tr('deleteAppBarTitle') : this.$tr('exportAppBarTitle'),
      };
    },
    components: {
      ChannelPanel,
      FilteredChannelListContainer,
      ImmersivePage,
      SelectionBottomBar,
      DeleteChannelModal,
      SelectDriveModal,
    },
    mixins: [taskNotificationMixin],
    setup() {
      useContentTasks();
    },
    props: {
      actionType: {
        type: String,
        required: true,
        validator(value) {
          return value === 'delete' || value === 'export';
        },
      },
    },
    data() {
      return {
        allChannels: [],
        selectedChannels: [],
        showModal: false,
        loading: true,
        fileSize: null,
      };
    },
    computed: {
      ...mapGetters('manageContent', ['channelIsBeingDeleted']),
      appBarTitle() {
        return this.exportMode ? this.$tr('exportAppBarTitle') : this.$tr('deleteAppBarTitle');
      },
      backRoute() {
        return { name: PageNames.MANAGE_CONTENT_PAGE };
      },
      exportMode() {
        return this.actionType === 'export';
      },
      deleteMode() {
        return this.actionType === 'delete';
      },
      modalProps() {
        if (this.exportMode) {
          return {
            exportFileSize: this.fileSize,
            manageMode: true,
          };
        }
        return {
          numberOfChannels: this.selectedChannels.length,
        };
      },
    },
    beforeMount() {
      this.fetchData();
    },
    methods: {
      fetchData() {
        return DeviceChannelResource.fetchCollection({
          getParams: {
            include_fields: 'on_device_file_size',
          },
          force: true,
        }).then(channels => {
          this.allChannels = [
            ...channels.filter(c => c.available && !this.channelIsBeingDeleted(c)),
          ];
          this.loading = false;
        });
      },
      deleteChannels() {
        const selectedCopy = [...this.selectedChannels];
        this.allChannels = this.allChannels.filter(c => !find(this.selectedChannels, { id: c.id }));
        return TaskResource.startTasks(
          this.selectedChannels.map(x => ({
            type: TaskTypes.DELETECHANNEL,
            channel_id: x.id,
            channel_name: x.name,
          })),
        )
          .then(tasks => {
            this.notifyAndWatchTask(tasks);
            this.selectedChannels = [];
          })
          .catch(() => {
            this.createTaskFailedSnackbar();
            this.selectedChannels = [...selectedCopy];
            this.loading = true;
            this.fetchData();
          });
      },
      exportChannels(params) {
        return TaskResource.startTasks(
          this.selectedChannels.map(({ id, name }) => ({
            type: TaskTypes.DISKEXPORT,
            channel_id: id,
            channel_name: name,
            drive_id: params.driveId,
          })),
        )
          .then(tasks => {
            this.notifyAndWatchTask(tasks);
          })
          .catch(() => {
            this.createTaskFailedSnackbar();
          });
      },
      handleClickConfirm() {
        this.showModal = true;
      },
      handleClickModalSubmit(params = {}) {
        this.showModal = false;

        if (this.deleteMode) {
          this.deleteChannels();
        } else {
          this.exportChannels(params);
        }
      },
      channelIsSelected(channel) {
        return Boolean(find(this.selectedChannels, { id: channel.id }));
      },
      channelSelectedMessage(channel) {
        if (this.channelIsSelected(channel)) {
          return this.$tr('channelSelectedMessage', {
            bytesText: bytesForHumans(channel.on_device_file_size),
          });
        }
        return '';
      },
    },
    $trs: {
      deleteAppBarTitle: {
        message: 'Delete channels',
        context: "Accessed via the 'Options' button.",
      },
      exportAppBarTitle: {
        message: 'Export channels',
        context:
          "Accessed via the 'Options' button. Admins can export Kolibri channels on a local drive in order to share with another device. ",
      },
      channelsOnDevice: {
        message: 'Channels on device',
        context: 'Indicates the channels which are on a device.',
      },
      channelSelectedMessage: {
        message: '{bytesText} selected',
        context: 'Indicates the size of the channels selected in bytes (GB or MB)',
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '../../styles/definitions';

  .device-container {
    @include device-kpagecontainer;
  }

</style>
