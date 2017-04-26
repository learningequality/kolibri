<template>

  <dropdown-menu
    :name="currentChannelName"
    :options="channelOptions"
    :inAppBar="true"
    :displayDisabledAsSelected="true"
    type="primary"
    color="white"
    icon="view_module"
    @select="emitSelection"
  />

</template>


<script>

  const sortBy = require('lodash/sortBy');

  module.exports = {
    $trNameSpace: 'channelSwitcher',
    $trs: {
      switchChannels: 'Switch channels',
    },
    components: {
      'dropdown-menu': require('kolibri.coreVue.components.dropdownMenu'),
    },
    computed: {
      sortedChannels() {
        return sortBy(this.channelList, channel => channel.title.toUpperCase());
      },
      channelOptions() {
        return this.sortedChannels.map(channel => {
          const channelOption = {};
          channelOption.id = channel.id;
          channelOption.label = channel.title;
          if (channelOption.id === this.globalCurrentChannel) {
            channelOption.disabled = true;
          }
          return channelOption;
        });
      },
      currentChannelName() {
        const channelName = Object(this.sortedChannels.find(
            channel => channel.id === this.globalCurrentChannel)).title;
        if (channelName) {
          return channelName;
        }
        return '';
      },
    },
    methods: {
      emitSelection(channel) {
        this.$emit('switch', channel.id);
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


<style lang="stylus"></style>
