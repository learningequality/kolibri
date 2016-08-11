<template>

  <div v-bind:class="['toolbar-show', displayToolBar ? 'toolbar-hide' : '' ]" >
    <breadcrumbs class="breadcrumbs"></breadcrumbs>
    <div class="toggle-menu">
      <label for="chan-select" class="visuallyhidden">Filter User Type</label>
      <select
        class="chan-select"
        id="chan-select"
        name="chan-select"
        v-model="getCurrentChannel"
        @change="switchChannel($event)"
      >
        <option v-for="channel in getChannels" :value="channel.id">{{ channel.name }}</option>
      </select>
    </div>
    <search-button @scrolling="handleScroll" class='search-btn'></search-button>
  </div>

</template>


<script>

  const constants = require('../../state/constants');
  const getters = require('../../state/getters');

  module.exports = {

    data: () => ({
      currScrollTop: 0,
      delta: 5,
      lastScrollTop: 0,
      displayToolBar: false,
    }),
    components: {
      'search-widget': require('../search-widget'),
      'search-button': require('../search-widget/search-button'),
      'breadcrumbs': require('../breadcrumbs'),
    },
    computed: {
      /*
      * Get a list of channels.
      */
      getChannels() {
        return this.channelList;
      },
      /*
      * Get the current channel ID.
      */
      getCurrentChannel() {
        return this.currentChannel;
      },
    },
    methods: {
      handleScroll(position) {
        this.position = position;
        this.currScrollTop = position.scrollTop;

        if (Math.abs(this.lastScrollTop - this.currScrollTop) <= this.delta) {
          return;
        }

        if (this.currScrollTop > this.lastScrollTop) {
          this.displayToolBar = true;
        } else {
          this.displayToolBar = false;
        }
        this.lastScrollTop = this.currScrollTop;
      },
      /*
      * Route to selected channel.
      */
      switchChannel(event) {
        let rootPage;
        if (this.exploreMode) {
          rootPage = constants.PageNames.EXPLORE_CHANNEL;
        } else {
          rootPage = constants.PageNames.LEARN_CHANNEL;
        }
        this.$router.go(
          {
            name: rootPage,
            params: {
              channel_id: event.target.value,
            },
          }
        );
      },
    },
    vuex: {
      getters: {
        rootTopicId: state => state.rootTopicId,
        topic: state => state.pageState.topic,
        isRoot: (state) => state.pageState.topic.id === state.rootTopicId,
        pageMode: getters.pageMode,
        pageName: state => state.pageName,
        currentChannel: state => state.currentChannel,
        channelList: state => state.channelList,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~core-theme.styl'
  @require '../learn.styl'

  .breadcrumbs
    position: relative
    left: 120px
    @media screen and (max-width: $portrait-breakpoint)
      left: 3rem

  .toolbar-show
    position: fixed
    left: -20px
    top: 0
    width: 100%
    height: 42px
    background: $core-bg-canvas
    z-index: 100
    transition: top 0.2s ease-in-out

  .toolbar-hide
    position: fixed
    left: -20px
    top: -40px

  .breadcrumbs
    left: 160px
    bottom: 20px
    position: relative
    @media screen and (max-width: $portrait-breakpoint)
      left: 24px

  .chan-select
    position: absolute
    top: 0.5rem
    right: 6em
    z-index: 1
    width: 11em
    padding: 0.2em 0.8em
    color: $core-text-annotation
    font-size: 0.9rem
    border: 1px solid $core-text-annotation
    border-radius: 50px
    background: url(../icons/arrowdown.svg) no-repeat right
    background-color: $core-bg-canvas
    -webkit-appearance: none
    -moz-appearance: none
    outline: none

  .search-btn
    position: absolute
    top: 0.6rem
    right: 2rem
    z-index: 1
    @media screen and (max-width: $portrait-breakpoint)
      right: 1rem

</style>
