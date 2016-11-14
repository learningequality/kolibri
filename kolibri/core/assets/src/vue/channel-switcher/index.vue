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
        this.$emit('switch', channelId);
      },
    },
    vuex: {
      getters: {
        globalCurrentChannel: state => state.core.channels.currentId,
        channelList: state => state.core.channels.list,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.coreTheme'

  .chan-select
    color: $core-text-annotation
    font-size: 0.9rem

</style>
