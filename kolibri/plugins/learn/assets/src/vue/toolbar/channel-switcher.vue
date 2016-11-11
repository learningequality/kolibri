<template>

  <div>
    <label for="chan-select" class="visuallyhidden">{{ $tr('switchChannels') }}</label>
    <select
      name="chan-select"
      id="chan-select"
      class="chan-select"
      v-model="localCurrentChannel">
      <option v-for="channel in channelList" :value="channel.id">{{ channel.title }}</option>
    </select>
  </div>

</template>


<script>

  const getCurrentChannelObject = require('kolibri.coreVue.vuex.getters').getCurrentChannelObject;
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
        isRoot: (state) => state.pageState.topic.id === getCurrentChannelObject(state).root_id,
        pageMode: getters.pageMode,
        globalCurrentChannel: state => state.core.channels.currentId,
        channelList: state => state.core.channels.list,
      },
      actions: {
        clearSearch: require('../../actions').clearSearch,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.coreTheme'
  @require '../learn.styl'

  .chan-select
    color: $core-text-annotation
    font-size: 0.9rem

</style>
