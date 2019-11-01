<template>

  <div v-if="!loading">
    <FilteredChannelListContainer :channels="allChannels">
      <template v-slot:header>
        <h1>{{ $tr('channelsOnDevice') }}</h1>
      </template>

      <template v-slot:default="{filteredItems, showItem}">
        <KCheckbox
          v-if="filteredItems.length > 0"
          class="select-all-checkbox"
          :label="$tr('selectAll')"
          :checked="selectAllIsChecked(filteredItems)"
          @change="handleChangeSelectAll($event, filteredItems)"
        />
        <ChannelCard
          v-for="channel in allChannels"
          v-show="showItem(channel)"
          :key="channel.id"
          :channel="channel"
          :selectedMessage="channelSelectedMessage(channel)"
          :checked="channelIsSelected(channel)"
          @checkboxchange="handleChangeChannel"
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
  import unionBy from 'lodash/unionBy';
  import differenceBy from 'lodash/differenceBy';
  import bytesForHumans from 'kolibri.utils.bytesForHumans';
  import { TaskResource } from 'kolibri.resources';
  import KResponsiveWindowMixin from 'kolibri-components/src/KResponsiveWindowMixin';
  import DeviceChannelResource from '../../apiResources/deviceChannel';
  import SelectionBottomBar from './SelectionBottomBar';
  import DeleteChannelModal from './DeleteChannelModal';
  import SelectDriveModal from './SelectTransferSourceModal/SelectDriveModal';
  import ChannelCard from './ChannelCard';
  import FilteredChannelListContainer from './FilteredChannelListContainer';

  // Overwrite methods that are coupled to vuex in original SelectDriveModal
  const SelectDrive = {
    extends: SelectDriveModal,
    computed: {
      driveCanBeUsedForTransfer() {
        return function isWritable({ drive }) {
          return drive.writable;
        };
      },
    },
    methods: {
      handleClickCancel() {
        this.$emit('cancel');
      },
      goForward() {
        this.$emit('submit', { driveId: this.selectedDriveId });
      },
    },
  };

  // UI for simple bulk Deletion or Export of entire channels
  export default {
    name: 'DeleteExportChannelsPage',
    metaInfo() {
      return {
        title: this.deleteMode ? this.$tr('deleteAppBarTitle') : this.$tr('exportAppBarTitle'),
      };
    },
    components: {
      ChannelCard,
      FilteredChannelListContainer,
      SelectionBottomBar,
      DeleteChannelModal,
      SelectDriveModal: SelectDrive,
    },
    mixins: [KResponsiveWindowMixin],
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
          };
        }
        return {};
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
      selectAllIsChecked(filteredItems) {
        return differenceBy(filteredItems, this.selectedChannels, 'id').length === 0;
      },
      fetchData() {
        DeviceChannelResource.fetchCollection({
          getParams: {
            include_fields: 'on_device_file_size',
          },
        }).then(channels => {
          this.allChannels = [
            ...channels.filter(c => c.available && !this.channelIsBeingDeleted(c)),
          ];
          this.loading = false;
        });
      },
      handleClickConfirm() {
        this.showModal = true;
      },
      handleClickModalSubmit(params = {}) {
        this.$store.dispatch('createTaskStartedSnackbar');
        this.showModal = false;

        if (this.deleteMode) {
          this.allChannels = this.allChannels.filter(
            c => !find(this.selectedChannels, { id: c.id })
          );
          TaskResource.deleteBulkChannels({
            channelIds: this.selectedChannels.map(({ id }) => ({ channel_id: id })),
          });
        } else {
          TaskResource.startDiskBulkExport(
            this.selectedChannels.map(({ id }) => ({
              channel_id: id,
              drive_id: params.driveId,
            }))
          );
        }

        this.selectedChannels = [];
      },
      channelIsSelected(channel) {
        return Boolean(find(this.selectedChannels, { id: channel.id }));
      },
      handleChangeSelectAll(isSelected, filteredItems) {
        if (isSelected) {
          this.selectedChannels = unionBy(this.selectedChannels, filteredItems, 'id');
        } else {
          this.selectedChannels = differenceBy(this.selectedChannels, filteredItems, 'id');
        }
      },
      handleChangeChannel({ channel, isSelected }) {
        if (isSelected) {
          if (!this.channelIsSelected(channel)) {
            this.selectedChannels.push(channel);
          }
        } else {
          this.selectedChannels = this.selectedChannels.filter(({ id }) => id !== channel.id);
        }
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
      selectAll: 'Select all on page',
    },
  };

</script>


<style lang="scss" scoped></style>
