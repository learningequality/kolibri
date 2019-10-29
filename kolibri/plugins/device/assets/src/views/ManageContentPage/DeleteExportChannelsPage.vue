<template>

  <div v-if="!loading">
    <FilteredChannelListContainer
      :channels="allChannels"
    >
      <template v-slot:header>
        <h1>{{ $tr('channelsOnDevice') }}</h1>
      </template>

      <template v-slot:default="{filteredItems}">
        <ChannelCard
          v-for="channel in filteredItems"
          :key="channel.id"
          :channel="channel"
        />
      </template>

    </FilteredChannelListContainer>

    <component
      :is="exportMode ? 'SelectDriveModal' : 'DeleteChannelModal'"
      v-if="showModal"
    />

    <SelectionBottomBar>
      Yo
    </SelectionBottomBar>
  </div>

</template>


<script>

  import KResponsiveWindowMixin from 'kolibri-components/src/KResponsiveWindowMixin';
  import DeviceChannelResource from '../../apiResources/deviceChannel';
  import SelectionBottomBar from './SelectionBottomBar';
  import DeleteChannelModal from './DeleteChannelModal';
  import ChannelCard from './ChannelCard';
  import FilteredChannelListContainer from './FilteredChannelListContainer';

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
    },
    mixins: [KResponsiveWindowMixin],
    props: {
      actionType: {
        type: String,
        required: true,
        default: 'delete',
      },
    },
    data() {
      return {
        showModal: false,
        allChannels: [],
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
      DeviceChannelResource.fetchCollection({}).then(channels => {
        this.allChannels = [...channels.filter(c => c.available)];
        this.loading = false;
      });
    },
    methods: {},
    $trs: {
      deleteAppBarTitle: 'Delete channels',
      exportAppBarTitle: 'Export channels',
      channelsOnDevice: 'Channels on device',
    },
  };

</script>


<style lang="scss" scoped></style>
