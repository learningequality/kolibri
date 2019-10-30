<template>

  <div v-if="!loading">
    <FilteredChannelListContainer :channels="allChannels">
      <template v-slot:header>
        <h1>{{ $tr('channelsOnDevice') }}</h1>
      </template>

      <template v-slot:default="{filteredItems}">
        <ChannelCard
          v-for="channel in allChannels"
          v-show="channelIsShown(channel, filteredItems)"
          :key="channel.id"
          :channel="channel"
          :selectedMessage="channelSelectedMessage(channel)"
          @checkboxchange="handleChangeChannel"
        />
      </template>
    </FilteredChannelListContainer>

    <component
      :is="exportMode ? 'SelectDriveModal' : 'DeleteChannelModal'"
      v-if="showModal"
      @cancel="showModal = false"
    />

    <SelectionBottomBar
      objectType="channel"
      :actionType="actionType"
      :selectedObjects="selectedChannels"
      @clickconfirm="handleClickConfirm"
    />
  </div>

</template>


<script>

  import find from 'lodash/find';
  import bytesForHumans from 'kolibri.utils.bytesForHumans';
  import KResponsiveWindowMixin from 'kolibri-components/src/KResponsiveWindowMixin';
  import DeviceChannelResource from '../../apiResources/deviceChannel';
  import SelectionBottomBar from './SelectionBottomBar';
  import DeleteChannelModal from './DeleteChannelModal';
  import SelectDriveModal from './SelectTransferSourceModal/SelectDriveModal';
  import ChannelCard from './ChannelCard';
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
      ChannelCard,
      FilteredChannelListContainer,
      SelectionBottomBar,
      DeleteChannelModal,
      SelectDriveModal,
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
      };
    },
    computed: {
      exportMode() {
        return this.actionType === 'export';
      },
      deleteMode() {
        return this.actionType === 'delete';
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
        DeviceChannelResource.fetchCollection({
          getParams: {
            include_fields: 'on_device_file_size',
          },
        }).then(channels => {
          this.allChannels = [...channels.filter(c => c.available)];
          this.loading = false;
        });
      },
      handleClickConfirm() {
        this.showModal = true;
      },
      channelIsSelected(channel) {
        return Boolean(find(this.selectedChannels, { id: channel.id }));
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
      channelIsShown(channel, filteredItems) {
        return Boolean(find(filteredItems, { id: channel.id }));
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
