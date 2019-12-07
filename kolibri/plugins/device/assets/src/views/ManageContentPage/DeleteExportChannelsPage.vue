<template>

  <div v-if="!loading">
    <FilteredChannelListContainer
      :channels="allChannels"
      :selectedChannels.sync="selectedChannels"
      :selectAllCheckbox="true"
    >
      <template v-slot:header>
        <h1>{{ $tr('channelsOnDevice') }}</h1>
      </template>

      <template v-slot:default="{filteredItems, showItem, handleChange, itemIsSelected}">
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
  </div>

</template>


<script>

  import { mapGetters } from 'vuex';
  import find from 'lodash/find';
  import bytesForHumans from 'kolibri.utils.bytesForHumans';
  import { TaskResource } from 'kolibri.resources';
  import KResponsiveWindowMixin from 'kolibri-components/src/KResponsiveWindowMixin';
  import DeviceChannelResource from '../../apiResources/deviceChannel';
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
      SelectionBottomBar,
      DeleteChannelModal,
      SelectDriveModal,
    },
    mixins: [KResponsiveWindowMixin, taskNotificationMixin],
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
      this.setAppBarTitle();
      this.fetchData();
    },
    methods: {
      setAppBarTitle() {
        const title = this.exportMode ? 'exportAppBarTitle' : 'deleteAppBarTitle';
        this.$store.commit('coreBase/SET_APP_BAR_TITLE', this.$tr(title));
      },
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
        return TaskResource.deleteBulkChannels({
          channelIds: this.selectedChannels.map(x => x.id),
        })
          .then(task => {
            this.notifyAndWatchTask(task);
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
        return TaskResource.startDiskBulkExport(
          this.selectedChannels.map(({ id }) => ({
            channel_id: id,
            drive_id: params.driveId,
          }))
        )
          .then(task => {
            this.notifyAndWatchTask(task);
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
      deleteAppBarTitle: 'Delete channels',
      exportAppBarTitle: 'Export channels',
      channelsOnDevice: 'Channels on device',
      channelSelectedMessage: '{bytesText} selected',
    },
  };

</script>


<style lang="scss" scoped></style>
