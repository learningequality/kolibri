<template>

  <div v-bind:class="['toolbar-show', displayToolBar ? 'toolbar-hide' : '' ]" v-show='!searchOpen' >
    <breadcrumbs class="breadcrumbs"></breadcrumbs>
    <div :class="{ 'toggle-menu-on' : more }">
      <label for="chan-select" :class="[ more ? 'lable-on' : 'visuallyhidden' ]" >Switch Channels</label>
      <select
        class="chan-select"
        :class="[ more ? 'chan-select-mobile-location' : 'chan-select-location' ]"
        id="chan-select"
        name="chan-select"
        v-model="getCurrentChannel"
        @change="switchChannel($event)"
      >
        <option v-for="channel in getChannels" :value="channel.id">{{ channel.name }}</option>
      </select>
    </div>
    <search-button @scrolling="handleScroll" class='search-btn'>
      <svg src="../search-widget/search.svg"></svg>
    </search-button>
    <button class="more" @click="toggleMore" ><svg src="../icons/more-ver.svg"></svg></button>
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
      more: false,
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

        this.more = false;

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
        this.more = false;
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
        currentChannel: state => state.currentChannel,
        channelList: state => state.channelList,
        searchOpen: state => state.searchOpen,
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
    left: -15px
    top: 0
    width: 100%
    height: 42px
    background: $core-bg-canvas
    z-index: 100
    transition: top 0.2s ease-in-out

  .toolbar-hide
    position: fixed
    left: -15px
    top: -40px

  .breadcrumbs
    left: 120px
    bottom: 22px
    position: relative
    @media screen and (max-width: $portrait-breakpoint)
      left: 24px

  .toggle-menu-on
    position: fixed
    display: table
    top: 3em
    right: 20px
    width: 200px
    height: 100px
    background: $core-bg-light
    border-radius: 4px
    text-align: center
    font-size: 0.9em
    color: $core-text-annotation
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.25)
    z-index: 2

  .toggle-menu-on::before
    content: ''
    position: absolute
    border-color: transparent transparent rgba(0, 0, 0, 0.1) transparent
    top: -11px
    border-style: solid
    border-width: 0 10px 10px 10px
    right: 9px
    margin-left: -8px

  .toggle-menu-on::after
    content: ''
    position: absolute
    border-style: solid
    border-width: 0 10px 10px 10px
    right: 9px
    margin-left: -8px
    border-color: transparent transparent #fff transparent
    top: -10px

  select:focus
    outline: $core-action-light 2px solid

  .chan-select
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
    @media screen and (max-width: $portrait-breakpoint)
      display: none

  .chan-select-location
    position: absolute
    top: 0.5rem
    right: 6em

  .chan-select-mobile-location
    position: relative
    display: table-cell
    margin: 0 auto
    top: 2.4em
    right: auto
    background-color: $core-bg-light

  .lable-on
    position: relative
    top: 1.2rem

  .search-btn
    position: absolute
    top: 0.1rem
    right: 1.2rem
    z-index: 1
    @media screen and (max-width: $portrait-breakpoint)
      right: 3rem

  .more
    display: none
    @media screen and (max-width: $portrait-breakpoint)
      position: absolute
      display: block
      top: 0.3rem
      right: 0
      border: none
      z-index: 1

</style>
