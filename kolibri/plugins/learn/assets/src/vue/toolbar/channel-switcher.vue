<template>

  <div>
    <label for="chan-select" class="visuallyhidden">{{ $tr('switchChannels') }}</label>
    <select
      name="chan-select"
      id="chan-select"
      class="chan-select"
      v-model="localCurrentChannel">
      <option v-for="channel in channelList" :value="channel.id">{{ channel.name }}</option>
    </select>
  </div>

</template>


<script>

  const constants = require('../../state/constants');
  const getters = require('../../state/getters');
  const PageModes = constants.PageModes;

  module.exports = {
    $trNameSpace: 'channelSwitcher',
    $trs: {
      switchChannels: 'Switch Channels',
    },
    computed: {
      /*
      * Get and set the current channel ID.
      */
      localCurrentChannel: {
        get() {
          return this.globalCurrentChannel;
        },
        set(newChannelId, oldChannelId) {
          if (newChannelId !== oldChannelId) {
            this.switchChannel(newChannelId);
          }
        },
      },
    },
    methods: {
      switchChannel(channelId) {
        let rootPage;
        if (this.pageMode === PageModes.EXPLORE) {
          rootPage = constants.PageNames.EXPLORE_CHANNEL;
        } else {
          rootPage = constants.PageNames.LEARN_CHANNEL;
        }
        this.clearSearch();
        this.$router.go(
          {
            name: rootPage,
            params: {
              channel_id: channelId,
            },
          }
        );
      },
    },
    vuex: {
      getters: {
        isRoot: (state) => state.pageState.topic.id === state.rootTopicId,
        pageMode: getters.pageMode,
        globalCurrentChannel: state => state.currentChannel,
        channelList: state => state.channelList,
      },
      actions: {
        clearSearch: require('../../actions').clearSearch,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~core-theme.styl'
  @require '../learn.styl'

  .chan-select
    color: $core-text-annotation
    font-size: 0.9rem
    position: absolute
    top: 0.5rem
    right: 6em
    @media screen and (max-width: $portrait-breakpoint)
      transform: translateX(-50%)
      left: 53%

</style>
