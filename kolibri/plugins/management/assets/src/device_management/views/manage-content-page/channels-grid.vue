<template>

  <div>
    <transition mode="out-in">
      <p
        class="core-text-alert no-channels"
        v-if="noChannelsToShow"
      >
        {{ $tr('emptyChannelListMessage') }}
      </p>

      <ui-progress-linear
        v-else-if="channelsLoading"
        type="indefinite"
        color="primary"
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
          />
        </div>
      </div>
    </transition>

    <delete-channel-modal
      v-if="channelIsSelected"
      :channelTitle="selectedChannelTitle"
      @confirm="handleDeleteChannel()"
      @cancel="selectedChannelId=null"
    />
  </div>

</template>


<script>

  import { refreshChannelList } from '../../state/actions/manageContentActions';
  import kButton from 'kolibri.coreVue.components.kButton';
  import uiProgressLinear from 'keen-ui/src/UiProgressLinear';
  import deleteChannelModal from './delete-channel-modal';
  import channelListItem from './channel-list-item';
  import { triggerChannelDeleteTask } from '../../state/actions/taskActions';
  import { installedChannelsWithResources } from '../../state/getters';

  export default {
    name: 'channelsGrid',
    components: {
      channelListItem,
      uiProgressLinear,
      deleteChannelModal,
      kButton,
    },
    data: () => ({
      selectedChannelId: null,
      channelsLoading: true,
    }),
    computed: {
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
        return this.sortedChannels.length === 0 && !this.channelsLoading;
      },
      sortedChannels() {
        return this.installedChannelsWithResources.slice().sort((c1, c2) => c1.name > c2.name);
      },
    },
    created() {
      this.refreshChannelList().then(() => {
        this.channelsLoading = false;
      });
    },
    methods: {
      handleDeleteChannel() {
        if (this.selectedChannelId !== null) {
          const channelId = this.selectedChannelId;
          this.selectedChannelId = null;
          this.triggerChannelDeleteTask(channelId);
        }
      },
    },
    vuex: {
      getters: {
        installedChannelsWithResources,
        pageState: state => state.pageState,
      },
      actions: {
        triggerChannelDeleteTask,
        refreshChannelList,
      },
    },
    $trs: {
      emptyChannelListMessage: 'No channels installed',
      channelHeader: 'Channel',
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  .channel-list-header
    font-size: 0.85em
    padding: 1em 0
    color: $core-text-annotation

  .channel-list-item:first-of-type
    border-top: 1px solid $core-grey

</style>
