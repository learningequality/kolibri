<template>

  <ui-icon-button
    icon="view_module"
    type="secondary"
    color="white"
    :ariaLabel="$tr('switchChannels')"
    has-dropdown
    ref="button">
    <ui-menu
      class="channel-switcher-menu"
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
    },
    methods: {
      channelSelected(channel) {
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


<style lang="stylus">

  @require '~kolibri.styles.definitions'

  .channel-switcher-menu
    .ui-menu-option
        &.is-disabled
          color: $core-action-normal
          font-weight: bold
          opacity: 1
          background-color: rgba(0, 0, 0, 0.05)

</style>
