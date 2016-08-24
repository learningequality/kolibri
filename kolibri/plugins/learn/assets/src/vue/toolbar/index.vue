<template>

  <div v-bind:class="['toolbar', displayToolbar ? 'toolbar-hide' : '']" v-show='!searchOpen'>
    <breadcrumbs class="breadcrumbs"></breadcrumbs>
      <label for="chan-select" class="visuallyhidden">{{ $tr('switchChannels') }}</label>
      <select
        name="chan-select"
        id="chan-select"
        class="chan-select"
        v-model="currentChannel">
        <option v-for="channel in channelList" :value="channel.id">{{ channel.name }}</option>
      </select>
    <search-button @scrolling="handleScroll" class='search-btn'></search-button>
  </div>

</template>


<script>

  const constants = require('../../state/constants');
  const getters = require('../../state/getters');
  const PageModes = constants.PageModes;

  module.exports = {

    $trNameSpace: 'learnToolbar',
    $trs: {
      switchChannels: 'Switch Channels',
    },

    data: () => ({
      currScrollTop: 0,
      lastScrollTop: 0,
      delta: 5,
      displayToolbar: false,
      more: false,
    }),
    components: {
      'search-widget': require('../search-widget'),
      'search-button': require('../search-widget/search-button'),
      'breadcrumbs': require('../breadcrumbs'),
    },
    computed: {
      /*
      * Get and set the current channel ID.
      */
      currentChannel: {
        get() {
          return this.currentChannelGetter;
        },
        set(newChannelId, oldChannelId) {
          if (newChannelId !== oldChannelId) {
            this.switchChannel(newChannelId);
          }
        },
      },
    },
    methods: {
      handleScroll(position) {
        this.position = position;
        this.currScrollTop = position.scrollTop;

        if (Math.abs(this.lastScrollTop - this.currScrollTop) <= this.delta) {
          return;
        }

        this.more = false;

        if (this.currScrollTop > this.lastScrollTop) {
          this.displayToolbar = true;
        } else {
          this.displayToolbar = false;
        }
        this.lastScrollTop = this.currScrollTop;
      },
      switchChannel(channelId) {
        let rootPage;
        this.more = false;
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
      toggleMore() {
        this.more = !this.more;
      },
    },
    vuex: {
      getters: {
        rootTopicId: state => state.rootTopicId,
        topic: state => state.pageState.topic,
        isRoot: (state) => state.pageState.topic.id === state.rootTopicId,
        pageMode: getters.pageMode,
        pageName: state => state.pageName,
        currentChannelGetter: state => state.currentChannel,
        channelList: state => state.channelList,
        searchOpen: state => state.searchOpen,
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

  .toolbar
    position: fixed
    left: -15px
    top: 0
    width: 100%
    height: $learn-toolbar-height
    background: $core-bg-canvas
    z-index: 100
    transition: top 0.2s ease-in-out
    outline: 1px solid $core-bg-canvas // prevent box outline flicking on Chrome

  .toolbar-hide
    position: fixed
    left: -15px
    top: -40px

  .breadcrumbs
    position: relative
    bottom: 22px
    left: 120px
    @media screen and (max-width: $portrait-breakpoint)
      left: 1.3em

  .chan-select
    color: $core-text-annotation
    font-size: 0.9rem
    position: absolute
    top: 0.5rem
    right: 6em
    @media screen and (max-width: $portrait-breakpoint)
      transform: translateX(-50%)
      left: 53%

  .search-btn
    position: absolute
    top: 0.1rem
    right: 1.2rem
    margin-right: 1em
    z-index: 1
    @media screen and (max-width: $portrait-breakpoint)
      margin-right: -1em

</style>
