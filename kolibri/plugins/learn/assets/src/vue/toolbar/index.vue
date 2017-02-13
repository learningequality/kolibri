<template>

  <div class="toolbar" :class="{ 'toolbar-hide': !shown }" v-show="!searchOpen">
    <breadcrumbs class="breadcrumbs"/>
    <div class="table-wrapper">
      <div class="row-wrapper">
        <channel-switcher class="switcher" @switch="switchChannel"/>
      </div>
    </div>
    <search-button class="search-btn"/>
  </div>

</template>


<script>

  const getters = require('../../state/getters');
  const constants = require('../../state/constants');

  module.exports = {
    props: {
      shown: {
        type: Boolean,
        default: true,
      },
    },
    components: {
      'search-button': require('./search-button'),
      'breadcrumbs': require('../breadcrumbs'),
      'channel-switcher': require('kolibri.coreVue.components.channelSwitcher'),
    },
    methods: {
      switchChannel(channelId) {
        let rootPage;
        if (this.pageMode === constants.PageModes.EXPLORE) {
          rootPage = constants.PageNames.EXPLORE_CHANNEL;
        } else {
          rootPage = constants.PageNames.LEARN_CHANNEL;
        }
        this.clearSearch();
        this.$router.push({
          name: rootPage,
          params: { channel_id: channelId },
        });
      },
    },
    vuex: {
      getters: {
        pageMode: getters.pageMode,
        searchOpen: state => state.searchOpen,
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

  $avoid-scrollbar = -25px

  .toolbar
    position: fixed
    left: $avoid-scrollbar
    top: 0
    width: 100%
    height: $learn-toolbar-height
    background: $core-bg-canvas
    z-index: 100
    transition: top 0.2s ease-in-out

  .toolbar-hide
    position: fixed
    left: $avoid-scrollbar
    top: -1 * $learn-toolbar-height

  .breadcrumbs
    position: relative
    bottom: 22px
    left: 120px
    @media screen and (max-width: $portrait-breakpoint)
      left: 1.3em

  .table-wrapper
    display: table
    height: $learn-toolbar-height
    position: absolute
    top: 0
    right: 5rem

  .row-wrapper
    display: table-row

  .switcher
    display: table-cell
    vertical-align: middle

  .search-btn
    height: $learn-toolbar-height
    position: absolute
    top: 0
    width: 36px
    right: 2rem

</style>
