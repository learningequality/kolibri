<template>

  <div>
    <transition mode="out-in">
      <p
        v-if="noChannelsToShow"
        class="no-channels"
        :style="{ color: $coreTextError }"
      >
        {{ $tr('emptyChannelListMessage') }}
      </p>

      <KLinearLoader
        v-else-if="channelListLoading"
        type="indeterminate"
        :delay="false"
      />

      <div v-else>
        <div class="channel-list-header" :style="{ color: $themeTokens.annotation }">
          {{ $tr('channelHeader') }}
        </div>

        <div class="channel-list">
          <ChannelListItem
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

    <DeleteChannelModal
      v-if="channelIsSelected"
      :channelTitle="selectedChannelTitle"
      @submit="handleDeleteChannel"
      @cancel="selectedChannelId=null"
    />
  </div>

</template>


<script>

  import { mapActions, mapGetters, mapState } from 'vuex';
  import themeMixin from 'kolibri.coreVue.mixins.themeMixin';
  import KLinearLoader from 'kolibri.coreVue.components.KLinearLoader';
  import DeleteChannelModal from './DeleteChannelModal';
  import ChannelListItem from './ChannelListItem';

  export default {
    name: 'ChannelsGrid',
    components: {
      ChannelListItem,
      KLinearLoader,
      DeleteChannelModal,
    },
    mixins: [themeMixin],
    data() {
      return {
        selectedChannelId: null,
      };
    },
    computed: {
      ...mapState('manageContent', ['channelListLoading']),
      ...mapGetters('manageContent', ['installedChannelsWithResources']),
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
        return this.sortedChannels.length === 0 && !this.channelListLoading;
      },
      sortedChannels() {
        return this.installedChannelsWithResources.slice().sort((c1, c2) => c1.name > c2.name);
      },
    },
    methods: {
      ...mapActions('manageContent', ['startImportWorkflow', 'triggerChannelDeleteTask']),
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

  .channel-list-header {
    padding: 16px 0;
    font-size: 12px;
  }

</style>
