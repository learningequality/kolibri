<template>

  <div>
    <transition mode="out-in">
      <p class="core-text-alert" v-if="sortedChannels.length===0 && !channelsLoading">
        {{ $tr('emptyChannelListMessage') }}
      </p>

      <ui-progress-linear v-else-if="channelsLoading" type="indefinite" color="primary" />

      <div v-else>
        <div class="channel-list-header">
          {{ $tr('channelHeader') }}
        </div>

        <div class="channel-list">
          <div class="channel-item-wrapper" v-for="channel in sortedChannels" :key="channel.id">
            <channel-list-item
              :channel="channel"
              mode="managing"
              @clickdelete="selectedChannelId=channel.id"
            />
          </div>
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
          return this.channelList.find(channel => channel.id === this.selectedChannelId).name;
        }
        return '';
      },
      sortedChannels() {
        return this.channelList.slice().sort(channel => channel.name);
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
        channelList: state => state.pageState.channelList,
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

  .channel-item-wrapper
    padding: 2em 0
    border-bottom: 1px solid $core-grey
    &:first-of-type
      border-top: 1px solid $core-grey

</style>
