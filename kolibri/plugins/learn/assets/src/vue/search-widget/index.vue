<template>

  <div class='wrapper'>

    <!-- search block -->
    <div class='top' role="search">
      <div class="top-wrapper">
        <div class="input-wrapper">
          <input
            type="search"
            v-el:search
            aria-label="Type to find content"
            placeholder="Find content..."
            autocomplete="off"
            v-focus="searchOpen"
            v-model="localSearchTerm"
            id="search"
            name="search"
            @keyup="search() | debounce 500"
            @keydown.esc.prevent="clear()"
          >
        </div>
          <button
            aria-label="Reset"
            class="reset"
            type="reset"
            @click="clear()"
            :style="{ visibility: localSearchTerm ? 'inherit' : 'hidden' }"
          >
          <svg src="./clear.svg" height="15" width="15" viewbox="0 0 24 24"></svg>
        </button>
        <search-button class='search-btn'>Cancel</search-button>
      </div>
    </div>

    <!-- results -->
    <div class='results' v-if="!loading">
      <h1 v-if="searchTerm">
        {{ message }}
      </h1>

      <h4 v-if="topics.length && showTopics">
        Topic
      </h4>

      <card-list class="card-list" v-if="topics.length && showTopics">
        <topic-list-item
          v-for="topic in topics"
          class="card"
          :id="topic.id"
          :title="topic.title"
          :ntotal="topic.n_total"
          :ncomplete="topic.n_complete">
        </topic-list-item>
      </card-list>

      <h4 v-if="contents.length">
        Content
      </h4>

      <card-grid v-if="contents.length">
        <content-grid-item
          v-for="content in contents"
          class="card"
          :title="content.title"
          :thumbnail="content.thumbnail"
          :kind="content.kind"
          :progress="content.progress"
          :id="content.id">
        </content-grid-item>
      </card-grid>
    </div>

  </div>

</template>


<script>

  const focus = require('vue-focus').focus;
  const actions = require('../../actions');


  module.exports = {
    $trNameSpace: 'learnSearch',

    $trs: {
      ariaLabel: 'Type to find content',
      placeHolder: 'Find content...',
    },
    directives: { focus },
    props: {
      showTopics: {
        type: Boolean,
        default: true,
      },
    },
    data() {
      return {
        localSearchTerm: '',
      };
    },
    computed: {
      message() {
        if (this.topics.length || this.contents.length) {
          return 'Search results:';
        } else if (!this.topics.length && !this.contents.length) {
          return 'Could not find any matches.';
        }
        return '';
      },
      ariaLabel() {
        return this.$tr('ariaLabel');
      },
      placeHolder() {
        return this.$tr('placeHolder');
      },
    },
    methods: {
      clear() {
        if (!this.localSearchTerm) {
          this.toggleSearch();
        } else {
          this.localSearchTerm = '';
          this.$els.search.focus();
          this.triggerSearch(this.localSearchTerm);
        }
      },
      search() {
        this.triggerSearch(this.localSearchTerm);
      },
    },
    components: {
      'topic-list-item': require('../topic-list-item'),
      'content-grid-item': require('../content-grid-item'),
      'search-button': require('./search-button'),
      'card-grid': require('../card-grid'),
    },
    vuex: {
      getters: {
        contents: state => state.searchState.contents,
        topics: state => state.searchState.topics,
        loading: state => state.searchLoading,
        searchTerm: state => state.searchState.searchTerm,
        searchOpen: state => state.searchOpen,
      },
      actions: {
        triggerSearch: actions.triggerSearch,
        toggleSearch: actions.toggleSearch,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~core-theme.styl'
  @require '../learn.styl'

  $top-offset = 60px

  h4
    margin-top: 3em

  .card-list
    margin-bottom: $card-gutter

  .wrapper
    margin: auto
    width-auto-adjust()

  .top
    background-color: $core-bg-canvas
    height: 42px
    padding-top: 0.5em
    z-index: 10000
    text-align: center
    position: fixed
    top: 0
    width-auto-adjust()
    @media screen and (max-width: $portrait-breakpoint)
      padding: 0.5em 0
      text-align: center
      width: 100%
      right: 15px

  .top-wrapper
    position: relative
    display: block
    height: 100%
    width: 80%
    margin: auto
    @media screen and (max-width: $medium-breakpoint)
      width: 100%
    @media screen and (max-width: $portrait-breakpoint)
      left: 15px

  .input-wrapper
      float: left
      width: 90%
      @media screen and (max-width: 1500px)
        width: 80%
      @media screen and (max-width: 840px)
        width: 70%
      @media screen and (max-width: $portrait-breakpoint)
        padding-left: 2em

  input
    height: 26px
    border: 1px solid $core-text-annotation
    border-radius: 4px
    padding: 0.3em 1em
    vertical-align: middle
    box-sizing: border-box
    width: 100%
    font-size: 0.9em
    left: -40px
    background-color: $core-bg-canvas
    &:focus
      margin: 0 auto
    @media screen and (max-width: $portrait-breakpoint)
      position: relative
      display: block
      width: 100%
      left: 0

  .reset
    border: none
    border-radius: 4px
    background-color: $core-bg-canvas // IE10 needs a non-transparent bg to be clickable
    display: inline-block
    outline: none
    cursor: pointer
    position: relative
    top: 2px
    right: 104px
    padding: 0 4px
    height: 22px
    svg
      fill: $core-text-annotation
      position: relative
      top: -2px
    @media screen and (max-width: 1500px)
      right: 138px
    @media screen and (max-width: 1277px)
      right: 120px
    @media screen and (max-width: 1059px)
      right: 104px
    @media screen and (max-width: $medium-breakpoint)
      right: 102px
    @media screen and (max-width: $portrait-breakpoint)
      right: 112px

  .search-btn
    float: left
    top: 0.5rem
    height: 26px
    width: 60px
    margin-left: 10px
    padding: 0.2em 0.7em
    border-radius: 4px
    font-size: 0.8em
    border: 1px solid $core-text-annotation
    color: $core-text-annotation
    z-index: 10001
    @media screen and (max-width: $portrait-breakpoint)
      width: 62px
      top: 0.7em

  .results
    padding-top: $top-offset
    padding-bottom: 100px
    @media screen and (max-width: $portrait-breakpoint)
      padding-top: 3em
      margin: 0 1em

</style>
