<template>

  <div>
    <ui-toolbar
      :title="title"
      type="colored"
      textColor="white"
      class="app-bar"
      @nav-icon-click="$emit('toggleSideNav')">
      <div slot="actions">
        <ui-icon-button
          icon="search"
          type="secondary"
          color="white"
          size="large"
          :ariaLabel="$tr('search')"/>

        <ui-icon-button
          icon="widgets"
          type="secondary"
          color="white"
          size="large"
          :ariaLabel="$tr('channelSwitcher')"/>
      </div>
    </ui-toolbar>
  </div>

</template>


<script>

  module.exports = {
    $trNameSpace: 'app-bar',
    $trs: {
      search: 'search',
      channelSwitcher: 'Channel Switcher',
    },
    props: {
      title: {
        type: String,
        required: true,
      },
    },
    components: {
      'ui-toolbar': require('keen-ui/src/UiToolbar'),
      'ui-icon-button': require('keen-ui/src/UiIconButton'),
    },
  };

</script>


<style lang="stylus" scoped>

  .app-bar
    // TODO: remove this
    z-index: 1000

</style>
