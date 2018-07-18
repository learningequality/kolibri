<template>

  <div>
    <transition mode="out-in">
      <p
        class="no-channels"
        v-if="noChannelsToShow"
      >
        {{ $tr('emptyChannelListMessage') }}
      </p>

      <k-linear-loader
        v-else-if="installedChannelListLoading"
        type="indeterminate"
        :delay="false"
      />

      <div v-else>
        <div class="channel-list-header">
          {{ $tr('channelHeader') }}
        </div>

        <div class="channel-list">
          <channel-list-item
            class="channel-list-item"
            v-for="channel in sortedChannels"
            :key="channel.id"
            :channel="channel"
            mode="MANAGE"
            @clickdelete="selectedChannelId=channel.id"
            @import_more="startImportWorkflow(channel)"
          />
        </div>
      </div>
    </transition>

    <delete-channel-modal
      v-if="channelIsSelected"
      :channelTitle="selectedChannelTitle"
      @confirm="handleDeleteChannel"
      @cancel="selectedChannelId=null"
    />
  </div>

</template>


<script>

  import { mapState, mapActions, mapGetters } from 'vuex';
  import KButton from 'kolibri.coreVue.components.KButton';
  import KLinearLoader from 'kolibri.coreVue.components.KLinearLoader';
  import DeleteChannelModal from './DeleteChannelModal';
  import ChannelListItem from './ChannelListItem';

  export default {
    name: 'ChannelsGrid',
    components: {
      ChannelListItem,
      KLinearLoader,
      DeleteChannelModal,
      KButton,
    },
    data: () => ({
      selectedChannelId: null,
    }),
    computed: {
      ...mapGetters(['installedChannelsWithResources', 'installedChannelListLoading']),
      ...mapState(['pageState']),
      channelIsSelected() {
        return this.selectedChannelId !== null;
      },
      selectedChannelTitle() {
        if (this.channelIsSelected) {
          return this.sortedChannels.find(channel => channel.id === this.selectedChannelId).name;
        }
        return '';
      },
      noChannelsToShow() {
        return this.sortedChannels.length === 0 && !this.installedChannelListLoading;
      },
      sortedChannels() {
        return this.installedChannelsWithResources.slice().sort((c1, c2) => c1.name > c2.name);
      },
    },
    methods: {
      ...mapActions(['startImportWorkflow', 'triggerChannelDeleteTask', 'refreshChannelList']),
      handleDeleteChannel() {
        if (this.channelIsSelected) {
          const channelId = this.selectedChannelId;
          this.selectedChannelId = null;
          this.triggerChannelDeleteTask(channelId);
        }
      },
    },
    $trs: {
      emptyChannelListMessage: 'No channels installed',
      channelHeader: 'Channel',
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri.styles.definitions';

  .channel-list-header {
    padding: 16px 0;
    font-size: 12px;
    color: $core-text-annotation;
  }

  .channel-list-item:first-of-type {
    border-top: 1px solid $core-grey;
  }

  .no-channels {
    color: $core-text-error;
  }

</style>
