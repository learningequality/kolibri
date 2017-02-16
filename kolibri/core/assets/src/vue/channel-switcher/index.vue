<template>

  <ui-icon-button
    icon="view_module"
    type="secondary"
    color="white"
    :ariaLabel="$tr('switchChannels')"
    has-dropdown
    ref="button">
    <ui-menu
      contain-focus
      contains-icons
      slot="dropdown"
      :options="channelOptions"
      @close="$refs.button.closeDropdown()"
      @select="channelSelected"/>
  </ui-icon-button>

</template>


<script>

  module.exports = {
    $trNameSpace: 'channelSwitcher',
    $trs: {
      switchChannels: 'Switch Channels',
    },
    components: {
      'ui-icon-button': require('keen-ui/src/UiIconButton'),
      'ui-menu': require('keen-ui/src/UiMenu'),
    },
    computed: {
      channelOptions() {
        const channelOptions = this.channelList.map(channel => ({
          id: channel.id,
          label: channel.title,
        }));
        return channelOptions;
      },
    },
    methods: {
      channelSelected(channel) {
        if (channel.id !== this.globalCurrentChannel) {
          this.switchChannel(channel.id);
        }
      },
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


<style lang="stylus" scoped></style>
