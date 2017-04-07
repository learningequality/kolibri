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

  module.exports = {
    $trNameSpace: 'channelSwitcher',
    $trs: {
      switchChannels: 'Switch channels',
    },
    components: {
      'dropdown-menu': require('kolibri.coreVue.components.dropdownMenu'),
    },
    computed: {
      channelOptions() {
        return this.channelList.map(channel => {
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
        const channelName = Object(this.channelList.find(
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
